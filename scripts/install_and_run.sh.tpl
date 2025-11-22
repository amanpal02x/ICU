#!/usr/bin/env bash
set -euo pipefail

# values injected by Terraform templatefile:
REPO_URL="${repo_url}"
BRANCH="${branch}"
APP_PORT=${app_port}
APP_DIR="/opt/app/backend"
S3_BUCKET="${s3_bucket_name}"
SQS_QUEUE_URL="${sqs_queue_url}"
AWS_REGION="${aws_region}"
USER="ubuntu"
SERVICE_NAME="icu-backend"

# install base packages (ensure awscli present)
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y python3 python3-venv python3-pip git inotify-tools curl jq unzip awscli

# ensure ubuntu user exists
id -u $${USER} >/dev/null 2>&1 || useradd -m -s /bin/bash $${USER}

# create app dirs and permissions
mkdir -p /opt/app
chown $${USER}:$${USER} /opt/app || true
mkdir -p /opt/app/models
chown -R $${USER}:$${USER} /opt/app/models

# clone or reset repo as ubuntu user
if [ ! -d "$${APP_DIR}" ]; then
  sudo -u $${USER} git clone --branch "${branch}" "${repo_url}" "$${APP_DIR}"
else
  cd "$${APP_DIR}"
  sudo -u $${USER} git fetch --all
  sudo -u $${USER} git reset --hard origin/"${branch}"
fi

cd "$${APP_DIR}"

# setup python venv and install deps (ensure boto3 + uvicorn present)
# create venv as ubuntu user so binaries & packages are writeable by that user
cd "$${APP_DIR}"
if [ ! -d "$${APP_DIR}/venv" ]; then
  sudo -u $${USER} python3 -m venv "$${APP_DIR}/venv"
fi

# install packages using the venv pip as the ubuntu user
sudo -u $${USER} "$${APP_DIR}/venv/bin/python" -m pip install --upgrade pip setuptools wheel || true

if [ -f "$${APP_DIR}/requirements.txt" ]; then
  sudo -u $${USER} "$${APP_DIR}/venv/bin/pip" install -r "$${APP_DIR}/requirements.txt" || true
fi

# make sure boto3 and uvicorn exist (safe installs)
sudo -u $${USER} "$${APP_DIR}/venv/bin/pip" install boto3 uvicorn || true

# create environment file used by systemd service (keeps values accessible on restart)
cat >/etc/icu-backend.env <<EOF
APP_DIR=$${APP_DIR}
APP_PORT=$${APP_PORT}
S3_BUCKET=${s3_bucket_name}
SQS_QUEUE_URL=${sqs_queue_url}
AWS_REGION=${aws_region}
USER=$${USER}
SERVICE_NAME=$${SERVICE_NAME}
BRANCH=${branch}
EOF
chmod 600 /etc/icu-backend.env

# initial sync of models (if bucket exists) using aws from PATH
if [ -n "${s3_bucket_name}" ]; then
  AWS_BIN="$(command -v aws || true)"
  if [ -n "$AWS_BIN" ]; then
    sudo -u $${USER} "$AWS_BIN" s3 sync "s3://${s3_bucket_name}/models" "$${APP_DIR}/models" --region "${aws_region}" || true
    chown -R $${USER}:$${USER} "$${APP_DIR}/models" || true
  else
    echo "aws CLI not found; skipping initial model sync"
  fi
fi

# create systemd service for backend (production mode)
cat >/etc/systemd/system/$${SERVICE_NAME}.service <<EOF
[Unit]
Description=ICU Backend Service
After=network.target

[Service]
User=$${USER}
WorkingDirectory=$${APP_DIR}
EnvironmentFile=/etc/icu-backend.env
ExecStart=$${APP_DIR}/venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port $${APP_PORT} --workers 1
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

# deploy helper: "pull, sync, install deps, restart"
cat >/usr/local/bin/deploy_pull_restart.sh <<'EOF'
#!/usr/bin/env bash
set -eo pipefail
# note: -u removed to avoid failure on absent env; defaults provided below

# source env if present
if [ -f /etc/icu-backend.env ]; then
  # shellcheck disable=SC1090
  source /etc/icu-backend.env
fi

# safe defaults
APP_DIR="${APP_DIR:-/opt/app/backend}"
USER="${USER:-ubuntu}"
AWS_REGION="${AWS_REGION:-us-east-2}"
S3_BUCKET="${S3_BUCKET:-}"
SERVICE_NAME="${SERVICE_NAME:-icu-backend}"
BRANCH="${BRANCH:-main}"

cd "${APP_DIR}" || exit 0

# update repo safely as deploy user
sudo -u "${USER}" git fetch --all || true
sudo -u "${USER}" git reset --hard origin/"${BRANCH}" || true

# ensure venv & tooling (create as deploy user)
if [ ! -d "${APP_DIR}/venv" ]; then
  sudo -u "${USER}" python3 -m venv "${APP_DIR}/venv"
fi
sudo -u "${USER}" "${APP_DIR}/venv/bin/python" -m pip install --upgrade pip setuptools wheel || true

# install requirements if present
if [ -f "${APP_DIR}/requirements.txt" ]; then
  sudo -u "${USER}" "${APP_DIR}/venv/bin/pip" install -r "${APP_DIR}/requirements.txt" || true
fi

# ensure uvicorn/boto3 in venv for deploy user
sudo -u "${USER}" "${APP_DIR}/venv/bin/pip" install uvicorn boto3 || true

# ensure awscli available (try system apt, else continue)
if ! command -v aws >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install -y awscli || true
  else
    echo "apt-get not available; aws CLI not installed automatically"
  fi
fi

# ensure app models dir and correct owner
mkdir -p "${APP_DIR}/models"
chown -R "${USER}:${USER}" "${APP_DIR}" || true

# sync models if bucket set (using aws from PATH)
if [ -n "${S3_BUCKET}" ]; then
  AWS_BIN="$(command -v aws || true)"
  if [ -n "$AWS_BIN" ]; then
    sudo -u "${USER}" "$AWS_BIN" s3 sync "s3://${S3_BUCKET}/models" "${APP_DIR}/models" --region "${AWS_REGION}" || true
    chown -R "${USER}:${USER}" "${APP_DIR}/models" || true
  else
    echo "aws CLI not available; skipping model sync"
  fi
fi

# restart the service
systemctl restart "${SERVICE_NAME}" || true
EOF
chmod +x /usr/local/bin/deploy_pull_restart.sh


# create model watcher (SQS poller) script
cat >/usr/local/bin/model_watcher.py <<'EOF'
#!/usr/bin/env python3
import os, time, json, boto3, subprocess, shutil

AWS_REGION = os.environ.get('AWS_REGION', '${aws_region}')
QUEUE_URL = os.environ.get('SQS_QUEUE_URL', '${sqs_queue_url}')
S3_BUCKET = "${s3_bucket_name}"
APP_DIR = os.environ.get('APP_DIR', '/opt/app/backend')

sqs = boto3.client('sqs', region_name=AWS_REGION)
s3 = boto3.client('s3', region_name=AWS_REGION)

def sync_and_restart():
    try:
        AWS_BIN = shutil.which("aws") or "/usr/bin/aws"
        subprocess.run([AWS_BIN, 's3', 'sync', f"s3://{S3_BUCKET}/models", f"{APP_DIR}/models", '--region', AWS_REGION], check=True)
        subprocess.run(['systemctl', 'restart', 'icu-backend'], check=True)
    except Exception:
        pass

while True:
    if not QUEUE_URL:
        time.sleep(10)
        continue
    try:
        resp = sqs.receive_message(QueueUrl=QUEUE_URL, MaxNumberOfMessages=5, WaitTimeSeconds=20)
        for msg in resp.get('Messages', []):
            try:
                body = msg.get('Body', '')
                j = json.loads(body)
                records = j.get('Records', []) or []
                do_sync = False
                for r in records:
                    key = r.get('s3', {}).get('object', {}).get('key', '')
                    if key and key.startswith('models/'):
                        do_sync = True
                if do_sync:
                    sync_and_restart()
            except Exception:
                pass
            try:
                sqs.delete_message(QueueUrl=QUEUE_URL, ReceiptHandle=msg['ReceiptHandle'])
            except Exception:
                pass
    except Exception:
        time.sleep(5)
EOF
chmod +x /usr/local/bin/model_watcher.py

# systemd unit for model watcher
cat >/etc/systemd/system/model-watcher.service <<EOF
[Unit]
Description=Model Watcher (polls SQS and downloads models)
After=network.target

[Service]
User=$${USER}
EnvironmentFile=/etc/icu-backend.env
ExecStart=$${APP_DIR}/venv/bin/python /usr/local/bin/model_watcher.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# reload and start services
systemctl daemon-reload
systemctl enable --now $${SERVICE_NAME}.service
systemctl enable --now model-watcher.service

# ensure ownership
chown -R $${USER}:$${USER} /opt/app || true
