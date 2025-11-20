#!/bin/bash
set -e
LOGFILE=/var/log/deploy_script.log
exec > >(tee -a ${LOGFILE}) 2>&1

echo ">>> deploy.sh starting at $(date -u)"

# ------------------------------
# 1. Install AWS CLI v2 if missing
# ------------------------------
if ! command -v aws >/dev/null 2>&1; then
  echo "AWS CLI missing — installing AWS CLI v2..."

  cd /tmp
  curl -s "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
  unzip -q awscliv2.zip
  sudo ./aws/install --update
  echo "AWS CLI installed."
fi

# ------------------------------
# 2. Ensure working directory exists
# ------------------------------
mkdir -p /home/appuser/backend
chown -R appuser:appuser /home/appuser

cd /home/appuser/backend

# ------------------------------
# 3. Pull latest code from GitHub
# ------------------------------
REPO_URL="https://github.com/amanpal02x/ICU.git"
BRANCH="main"

if [ ! -d "/home/appuser/backend/.git" ]; then
    echo "Cloning repo..."
    sudo -u appuser git clone -b "$BRANCH" "$REPO_URL" /home/appuser/backend
else
    echo "Pulling latest changes..."
    sudo -u appuser git fetch --all
    sudo -u appuser git reset --hard "origin/$BRANCH"
fi

# ------------------------------
# 4. Python dependencies
# ------------------------------
if [ ! -f "/home/appuser/backend/venv/bin/pip" ]; then
  echo "Creating Python virtual environment..."
  sudo -u appuser python3 -m venv /home/appuser/backend/venv
fi

echo "Updating dependencies..."
sudo -u appuser /home/appuser/backend/venv/bin/pip install --upgrade pip
sudo -u appuser /home/appuser/backend/venv/bin/pip install -r /home/appuser/backend/requirements.txt

# ------------------------------
# 5. Sync latest ML models from S3
# ------------------------------
S3_BUCKET="icu-model"   # From Terraform output
AWS_REGION="us-east-2"  # Your EC2 + S3 region

echo "Syncing S3 models from bucket: $S3_BUCKET"

aws s3 sync "s3://${S3_BUCKET}/models" \
    /home/appuser/backend/models \
    --region $AWS_REGION || true

chown -R appuser:appuser /home/appuser/backend/models

# ------------------------------
# 6. Refresh .env from Secrets Manager
# ------------------------------
SECRET_ARN="arn:aws:secretsmanager:us-east-2:601559288497:secret:icu-monitor-mongodb-uri-FNg9Ej"

echo "Fetching Mongo URI from Secrets Manager..."

MONGO_URI=$(aws secretsmanager get-secret-value \
    --secret-id "$SECRET_ARN" \
    --region "$AWS_REGION" \
    --query SecretString \
    --output text || true)

if [ -n "$MONGO_URI" ]; then
    echo "MONGODB_URL=$MONGO_URI" > /home/appuser/backend/.env
    chown appuser:appuser /home/appuser/backend/.env
    echo ".env updated."
else
    echo "WARNING: Secret not found — keeping existing .env"
fi

# ------------------------------
# 7. Restart systemd service
# ------------------------------
echo "Restarting backend service..."

sudo systemctl daemon-reload
sudo systemctl restart ml-backend
sleep 3

sudo systemctl status ml-backend --no-pager -l || true

echo ">>> deploy.sh finished at $(date -u)"
