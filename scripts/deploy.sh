#!/bin/bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

# these values will be substituted by the caller (or you can read env vars)
REPO_URL="${REPO_URL:-}"
S3_BUCKET="${S3_BUCKET:-}"
MONGODB_URI="${MONGODB_URI:-}"
UVICORN_MODULE="${UVICORN_MODULE:-main:app}"
UVICORN_WORKERS="${UVICORN_WORKERS:-1}"

# Install system packages
apt-get update -y
apt-get install -y git python3 python3-venv python3-pip awscli curl

# Create user
id -u appuser >/dev/null 2>&1 || useradd -m -s /bin/bash appuser

# Clone or update repo
sudo -u appuser bash -lc '
  set -e
  cd /home/appuser
  if [ ! -d app ]; then
    git clone --depth 1 "'"${REPO_URL:-}"'" app || true
  else
    cd app
    git fetch --all --prune || true
    git reset --hard origin/main || true
  fi
'

# Setup venv + install deps
sudo -u appuser bash -lc '
  cd /home/appuser/app
  python3 -m venv venv || true
  source venv/bin/activate
  pip install --upgrade pip
  if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
'

# Download model from S3 (if provided)
if [ -n "${S3_BUCKET}" ]; then
  sudo -u appuser mkdir -p /home/appuser/app/models
  aws s3 cp "s3://${S3_BUCKET}/models/latest_model.pkl" /home/appuser/app/models/latest_model.pkl || true
fi

# Create/update systemd service
cat > /etc/systemd/system/fastapi-app.service <<SERVICE
[Unit]
Description=FastAPI App
After=network.target

[Service]
User=appuser
WorkingDirectory=/home/appuser/app
Environment="MONGODB_URI=${MONGODB_URI}"
ExecStart=/bin/bash -lc 'source /home/appuser/app/venv/bin/activate && exec uvicorn ${UVICORN_MODULE} --host 0.0.0.0 --port 8000 --workers ${UVICORN_WORKERS}'
Restart=always

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable fastapi-app
systemctl restart fastapi-app || (journalctl -u fastapi-app -n 200 --no-pager; exit 1)

# health check
for i in $(seq 1 20); do
  if curl -sSf http://127.0.0.1:8000/health >/dev/null 2>&1; then
    echo "health ok"
    exit 0
  fi
  sleep 2
done

journalctl -u fastapi-app -n 200 --no-pager || true
exit 1
