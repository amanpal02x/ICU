#!/bin/bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
AWS_REGION="${AWS_REGION:-us-east-2}"

#########################################
# Expected ENV variables (injected by SSM)
# REPO_URL
# S3_BUCKET
# MONGODB_URI       (optional, can be "" )
# UVICORN_MODULE
# UVICORN_WORKERS
#########################################

REPO_URL="${REPO_URL:-}"
S3_BUCKET="${S3_BUCKET:-}"
MONGODB_URI="${MONGODB_URI:-}"
UVICORN_MODULE="${UVICORN_MODULE:-main:app}"
UVICORN_WORKERS="${UVICORN_WORKERS:-1}"

#########################################
# FIX: Install AWS CLI v2 (Ubuntu default AWS CLI v1 is broken)
#########################################
echo "Installing AWS CLI v2..."
apt-get update -y
apt-get install -y unzip curl || true

# Remove old AWS CLI if exists
apt-get remove -y awscli || true

# Install AWS CLI v2 cleanly
curl -sSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
unzip -o /tmp/awscliv2.zip -d /tmp
/tmp/aws/install --update

echo "AWS CLI Installed:"
/usr/local/bin/aws --version || true

#########################################
# Install system packages
#########################################
apt-get update -y
apt-get install -y git python3 python3-venv python3-pip curl

python3 -m pip install --upgrade pip

#########################################
# Create app user
#########################################
id -u appuser >/dev/null 2>&1 || useradd -m -s /bin/bash appuser

#########################################
# Clone or update backend repository
#########################################
sudo -u appuser bash -lc "
  set -e
  cd /home/appuser
  if [ ! -d app ]; then
    if [ -n '$REPO_URL' ]; then
      git clone --depth 1 '$REPO_URL' app || true
    fi
  else
    cd app
    git fetch --all --prune || true
    git reset --hard origin/main || true
  fi
"

#########################################
# Setup venv & install backend dependencies
#########################################
sudo -u appuser bash -lc "
  cd /home/appuser/app || exit 0
  python3 -m venv venv || true
  source venv/bin/activate
  pip install --upgrade pip
  if [ -f requirements.txt ]; then
    pip install -r requirements.txt
  else
    pip install uvicorn
  fi
"

#########################################
# Download ML model (optional)
#########################################
if [ -n "$S3_BUCKET" ]; then
  echo "Downloading model from S3..."
  sudo -u appuser mkdir -p /home/appuser/app/models
  /usr/local/bin/aws s3 cp "s3://${S3_BUCKET}/models/latest_model.pkl" \
      /home/appuser/app/models/latest_model.pkl || true
fi

#########################################
# Write systemd service
#########################################
cat > /etc/systemd/system/fastapi-app.service <<SERVICE
[Unit]
Description=FastAPI Application Service
After=network.target

[Service]
User=appuser
WorkingDirectory=/home/appuser/app
Environment="MONGODB_URI=${MONGODB_URI}"
ExecStart=/bin/bash -lc 'source /home/appuser/app/venv/bin/activate && exec uvicorn ${UVICORN_MODULE} --host 0.0.0.0 --port 8000 --workers ${UVICORN_WORKERS}'
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable fastapi-app
systemctl restart fastapi-app || (journalctl -u fastapi-app -n 200 --no-pager; exit 1)

#########################################
# Health check
#########################################
echo "Running health check..."
for i in $(seq 1 20); do
  if curl -sSf http://127.0.0.1:8000/health >/dev/null 2>&1; then
    echo "Health OK"
    exit 0
  fi
  echo "Health check try $i failed..."
  sleep 2
done

echo "Health check FAILED — printing logs"
journalctl -u fastapi-app -n 200 --no-pager || true
exit 1
