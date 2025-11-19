#!/bin/bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
AWS_REGION="${AWS_REGION:-us-east-2}"

# caller-provided values (from workflow/SSM)
REPO_URL="${REPO_URL:-}"
S3_BUCKET="${S3_BUCKET:-}"
UVICORN_MODULE="${UVICORN_MODULE:-main:app}"
UVICORN_WORKERS="${UVICORN_WORKERS:-1}"

#############################
# Fetch MongoDB URI (secure)
#############################
# If MONGODB_URI not provided, attempt to fetch from Secrets Manager
if [ -z "${MONGODB_URI:-}" ] || [ "${MONGODB_URI}" = "null" ]; then
  echo "Attempting to fetch MONGODB_URI from Secrets Manager..."
  # name used earlier in instructions: icu/mongodb_uri — adjust if you used another name
  MONGODB_URI=$(aws secretsmanager get-secret-value --secret-id icu/mongodb_uri --region "${AWS_REGION}" --query SecretString --output text 2>/dev/null || true)
  if [ -z "${MONGODB_URI}" ]; then
    echo "Warning: MONGODB_URI not set and not found in Secrets Manager. Service will start without DB connection."
  else
    echo "Fetched MongoDB URI from Secrets Manager."
  fi
else
  echo "Using provided MONGODB_URI environment value."
fi

#############################
# Install system packages
#############################
apt-get update -y
apt-get install -y git python3 python3-venv python3-pip awscli curl

# ensure pip and tools
python3 -m pip install --upgrade pip

#############################
# Create app user
#############################
id -u appuser >/dev/null 2>&1 || useradd -m -s /bin/bash appuser

#############################
# Clone or update repo
#############################
sudo -u appuser bash -lc '
  set -e
  cd /home/appuser
  if [ ! -d app ]; then
    if [ -n "'"${REPO_URL}"'" ]; then
      git clone --depth 1 "'"${REPO_URL}"'" app || true
    fi
  else
    cd app
    git fetch --all --prune || true
    git reset --hard origin/main || true
  fi
'

#############################
# Setup venv + install deps
#############################
sudo -u appuser bash -lc '
  set -e
  cd /home/appuser/app || exit 0
  python3 -m venv venv || true
  source venv/bin/activate
  pip install --upgrade pip
  if [ -f requirements.txt ]; then
    pip install -r requirements.txt
  else
    # ensure uvicorn is present
    pip install uvicorn
  fi
'

#############################
# Download model from S3 (optional)
#############################
if [ -n "${S3_BUCKET}" ]; then
  sudo -u appuser mkdir -p /home/appuser/app/models
  aws s3 cp "s3://${S3_BUCKET}/models/latest_model.pkl" /home/appuser/app/models/latest_model.pkl || true
fi

#############################
# Write systemd service (safe)
#############################
# We avoid quoting problems by writing the resolved MONGODB_URI verbatim into the unit file.
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
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable fastapi-app
systemctl restart fastapi-app || (journalctl -u fastapi-app -n 200 --no-pager; exit 1)

#############################
# Health check
#############################
for i in $(seq 1 20); do
  if curl -sSf http://127.0.0.1:8000/health >/dev/null 2>&1; then
    echo "health ok"
    exit 0
  fi
  echo "health try $i failed, sleeping..."
  sleep 2
done

echo "Health check failed; printing journal"
journalctl -u fastapi-app -n 200 --no-pager || true
exit 1
