#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

AWS_REGION="${AWS_REGION:-us-east-2}"
REPO_URL="${REPO_URL:-}"
S3_BUCKET="${S3_BUCKET:-}"
MONGODB_URI="${MONGODB_URI:-}"
UVICORN_MODULE="${UVICORN_MODULE:-main:app}"
UVICORN_WORKERS="${UVICORN_WORKERS:-1}"

echo "=== INSTALLING AWS CLI v2 ==="
apt-get update -y
apt-get install -y curl unzip

curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
unzip -q /tmp/awscliv2.zip -d /tmp
/tmp/aws/install --update

echo "=== INSTALLING PYTHON & GIT ==="
apt-get install -y git python3 python3-venv python3-pip

echo "=== ENSURE USER appuser EXISTS ==="
id -u appuser >/dev/null 2>&1 || useradd -m -s /bin/bash appuser

echo "=== CLONE OR UPDATE REPO ==="
sudo -u appuser bash -lc "
  set -e
  cd /home/appuser
  if [ ! -d app ]; then
      git clone --depth 1 '${REPO_URL}' app
  else
      cd app
      git fetch --all --prune || true
      git reset --hard origin/main || true
  fi
"

echo "=== FIX OWNERSHIP ==="
chown -R appuser:appuser /home/appuser/app
chmod -R u+rwX /home/appuser/app

echo "=== SETUP PYTHON VENV ==="
sudo -u appuser bash -lc "
  cd /home/appuser/app
  python3 -m venv venv || true
  source venv/bin/activate
  pip install --upgrade pip
  [ -f requirements.txt ] && pip install -r requirements.txt || pip install uvicorn fastapi
"

echo "=== DOWNLOAD MODEL (IF EXISTS) ==="
if [ -n "${S3_BUCKET}" ]; then
  sudo -u appuser mkdir -p /home/appuser/app/models
  aws s3 cp \"s3://${S3_BUCKET}/models/latest_model.pkl\" /home/appuser/app/models/latest_model.pkl || true
fi

echo "=== CREATE SYSTEMD FILE ==="
cat >/etc/systemd/system/fastapi-app.service <<EOF
[Unit]
Description=FastAPI App Service
After=network.target

[Service]
User=appuser
WorkingDirectory=/home/appuser/app
Environment="MONGODB_URI=${MONGODB_URI}"
ExecStart=/bin/bash -lc 'source /home/appuser/app/venv/bin/activate && exec uvicorn ${UVICORN_MODULE} --host 0.0.0.0 --port 8000 --workers ${UVICORN_WORKERS}'
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable fastapi-app
systemctl restart fastapi-app

echo "=== HEALTH CHECK ==="
for i in {1..20}; do
    if curl -sSf http://127.0.0.1:8000/health >/dev/null; then
        echo "Health OK"
        exit 0
    fi
    echo "Retry $i..."
    sleep 2
done

echo "Service failed to start. Logs:"
journalctl -u fastapi-app -n 200 --no-pager || true
exit 1
