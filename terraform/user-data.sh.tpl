#!/bin/bash
set -euo pipefail
exec > /var/log/user-data.log 2>&1

# --- variables substituted by Terraform templatefile ---
REGION="${region}"
SECRET_ARN="${secret_arn}"
REPO_URL="${repo_url}"
BRANCH="${branch}"
S3_BUCKET="${s3_bucket}"
BACKEND_PORT="${backend_port}"
PROJECT_NAME="${project_name}"

# Update + packages
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y python3 python3-pip python3-venv git nginx unzip awscli jq curl apt-transport-https ca-certificates gnupg

# Install/ensure SSM Agent (so Session Manager works)
if ! command -v amazon-ssm-agent >/dev/null 2>&1; then
  # For Ubuntu Jammy, use the packaged agent if available, else try apt
  apt-get install -y amazon-ssm-agent || true
  systemctl enable amazon-ssm-agent || true
  systemctl start amazon-ssm-agent || true
fi

# Try install CloudWatch agent package (best-effort)
if ! command -v /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl >/dev/null 2>&1; then
  # Try apt package first
  apt-get install -y amazon-cloudwatch-agent || true
fi

# Create appuser
id -u appuser >/dev/null 2>&1 || useradd -m -s /bin/bash appuser || true
chown -R appuser:appuser /home/appuser || true

# Clone or update repo as appuser
if [ ! -d /home/appuser/backend ]; then
  sudo -u appuser git clone "${REPO_URL}" /home/appuser/backend || true
else
  sudo -u appuser git -C /home/appuser/backend pull origin "${BRANCH}" || true
fi

# Fetch MongoDB URI from Secrets Manager and write .env (if secret exists)
MONGO_URI="$(aws secretsmanager get-secret-value --secret-id "${SECRET_ARN}" --region "${REGION}" --query SecretString --output text 2>/dev/null || true)"
if [ -n "${MONGO_URI}" ]; then
  echo "MONGODB_URL=${MONGO_URI}" > /home/appuser/backend/.env
  chown appuser:appuser /home/appuser/backend/.env
fi

# Python venv + install requirements (best-effort)
if [ -d /home/appuser/backend ]; then
  cd /home/appuser/backend || exit 0
  sudo -u appuser python3 -m venv venv || true
  sudo -u appuser ./venv/bin/pip install --upgrade pip setuptools wheel || true
  if [ -f requirements.txt ]; then
    sudo -u appuser ./venv/bin/pip install -r requirements.txt || true
  fi
fi

# sync models from S3 (best-effort)
if [ -n "${S3_BUCKET}" ]; then
  sudo -u appuser aws s3 sync "s3://${S3_BUCKET}/models" /home/appuser/backend/models --region "${REGION}" || true
  chown -R appuser:appuser /home/appuser/backend/models || true
fi

# configure CloudWatch agent using SSM param (if available)
if [ -x /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl ]; then
  aws ssm get-parameter --name "/${PROJECT_NAME}/cloudwatch-agent-config" --region "${REGION}" --query Parameter.Value --output text > /tmp/cw-config.json || true
  if [ -s /tmp/cw-config.json ]; then
    /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/tmp/cw-config.json -s || true
  fi
fi

# Create systemd service for the app (use appuser and venv)
cat > /etc/systemd/system/ml-backend.service <<'EOF'
[Unit]
Description=ICU ML Backend
After=network.target

[Service]
User=appuser
WorkingDirectory=/home/appuser/backend
ExecStart=/home/appuser/backend/venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port ${BACKEND_PORT} --workers 1
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ml-backend || true
systemctl start ml-backend || true

# nginx reverse proxy
cat > /etc/nginx/sites-available/ml-backend <<'NGX'
server {
  listen 80;
  server_name _;
  location / {
    proxy_pass http://127.0.0.1:${BACKEND_PORT};
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
NGX

ln -sf /etc/nginx/sites-available/ml-backend /etc/nginx/sites-enabled/ml-backend
rm -f /etc/nginx/sites-enabled/default || true
systemctl restart nginx || true

# end of user-data
