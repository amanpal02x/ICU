#!/usr/bin/env bash
set -e

REPO_URL="${repo_url}"
BRANCH="${branch}"
APP_PORT=${app_port}
APP_DIR="/opt/app/backend"
SQS_QUEUE_URL="${sqs_queue_url}"
AWS_REGION="${aws_region}"

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y python3 python3-venv python3-pip git inotify-tools curl jq awscli

# ensure ubuntu user exists
id -u ubuntu >/dev/null 2>&1 || useradd -m -s /bin/bash ubuntu

mkdir -p /opt/app
chown ubuntu:ubuntu /opt/app || true

# clone or reset repo as ubuntu user
if [ ! -d "$APP_DIR" ]; then
  sudo -u ubuntu git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
else
  cd "$APP_DIR"
  sudo -u ubuntu git fetch --all
  sudo -u ubuntu git reset --hard origin/$BRANCH
fi

cd "$APP_DIR"

# venv + deps
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
if [ -f requirements.txt ]; then
  pip install -r requirements.txt || true
fi

# model dir
mkdir -p /opt/app/models
chown -R ubuntu:ubuntu /opt/app/models

# systemd service for backend
cat >/etc/systemd/system/backend.service <<EOF
[Unit]
Description=Backend App (uvicorn)
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/opt/app/backend
Environment="PATH=/opt/app/backend/venv/bin"
ExecStart=/opt/app/backend/venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port ${app_port} --reload
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# deploy helper
cat >/usr/local/bin/deploy_pull_restart.sh <<EOF
#!/usr/bin/env bash
set -e
cd /opt/app/backend
sudo -u ubuntu git pull origin $BRANCH || true
source /opt/app/backend/venv/bin/activate
pip install -r requirements.txt || true
systemctl restart backend.service
EOF
chmod +x /usr/local/bin/deploy_pull_restart.sh

# model watcher - polls SQS and downloads models
cat >/usr/local/bin/model_watcher.py <<EOF
#!/usr/bin/env python3
import os, time, json, boto3
AWS_REGION = os.environ.get('AWS_REGION', '${aws_region}')
QUEUE_URL = os.environ.get('SQS_QUEUE_URL', '${sqs_queue_url}')
s3 = boto3.client('s3', region_name=AWS_REGION)
sqs = boto3.client('sqs', region_name=AWS_REGION)

while True:
    if not QUEUE_URL or QUEUE_URL == '':
        time.sleep(10)
        continue
    resp = sqs.receive_message(QueueUrl=QUEUE_URL, MaxNumberOfMessages=5, WaitTimeSeconds=10)
    for msg in resp.get('Messages', []):
        body = msg.get('Body', '')
        try:
            j = json.loads(body)
            records = j.get('Records', []) or []
            for r in records:
                bucket = r['s3']['bucket']['name']
                key = r['s3']['object']['key']
                if key.startswith('models/'):
                    local_path = '/opt/app/models/' + key.split('/',1)[1]
                    os.makedirs(os.path.dirname(local_path), exist_ok=True)
                    s3.download_file(bucket, key, local_path)
        except Exception:
            pass
        sqs.delete_message(QueueUrl=QUEUE_URL, ReceiptHandle=msg['ReceiptHandle'])
    time.sleep(1)
EOF
chmod +x /usr/local/bin/model_watcher.py

# systemd service for model watcher
cat >/etc/systemd/system/model-watcher.service <<EOF
[Unit]
Description=Model Watcher (polls SQS and downloads models)
After=network.target

[Service]
User=ubuntu
Environment="SQS_QUEUE_URL=${sqs_queue_url}"
Environment="AWS_REGION=${aws_region}"
ExecStart=/usr/bin/env python3 /usr/local/bin/model_watcher.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable backend.service
systemctl enable model-watcher.service
systemctl start backend.service || true
systemctl start model-watcher.service || true

chown -R ubuntu:ubuntu /opt/app
