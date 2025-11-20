#!/bin/bash
set -e
LOGFILE=/var/log/deploy_script.log
exec > >(tee -a ${LOGFILE}) 2>&1

echo ">>> deploy.sh starting at $(date -u)"

# ensure awscli exists on server
if ! command -v aws >/dev/null 2>&1; then
  echo "aws cli missing, installing..."
  sudo apt-get update -y
  sudo apt-get install -y awscli
fi

cd /home/appuser/backend

# Pull latest code
if [ -d .git ]; then
  sudo -u appuser git fetch --all
  sudo -u appuser git reset --hard origin/main
else
  sudo -u appuser git clone https://github.com/amanpal02x/ICU /home/appuser/backend
fi

# Install/update python deps
sudo -u appuser /home/appuser/backend/venv/bin/pip install --upgrade pip
sudo -u appuser /home/appuser/backend/venv/bin/pip install -r /home/appuser/backend/requirements.txt

# Sync models from S3
aws s3 sync s3://icu-model/models /home/appuser/backend/models --region ap-south-1 || true
chown -R appuser:appuser /home/appuser/backend/models

# Refresh .env from Secrets Manager
MONGO_URI=$(aws secretsmanager get-secret-value --secret-id "${1:-ml-mongodb-uri}" --region ap-south-1 --query SecretString --output text || true)
if [ -n "${MONGO_URI}" ]; then
  echo "MONGODB_URL=${MONGO_URI}" > /home/appuser/backend/.env
  chown appuser:appuser /home/appuser/backend/.env
fi

# Restart systemd service
sudo systemctl restart ml-backend
sleep 2
sudo systemctl status ml-backend --no-pager -l || true

echo ">>> deploy.sh finished at $(date -u)"
