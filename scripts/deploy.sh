#!/bin/bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
AWS_REGION="${AWS_REGION:-us-east-2}"
LOGFILE="/tmp/deploy.log"
exec > >(tee -a "$LOGFILE") 2>&1

echo "=== deploy.sh start: $(date -u) ==="

# caller-provided values (from workflow/SSM)
REPO_URL="${REPO_URL:-}"
S3_BUCKET="${S3_BUCKET:-}"
UVICORN_MODULE="${UVICORN_MODULE:-main:app}"
UVICORN_WORKERS="${UVICORN_WORKERS:-1}"

# ---- ensure a working aws cli (install v2 if needed) ----
if command -v aws >/dev/null 2>&1; then
  echo "aws exists: $(aws --version 2>&1 || true)"
fi

# remove potentially-bad apt-installed awscli, then install v2
apt-get remove -y awscli || true
apt-get update -y
apt-get install -y unzip curl || true

if ! command -v /usr/local/bin/aws >/dev/null 2>&1; then
  echo "Installing AWS CLI v2..."
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
  unzip -o /tmp/awscliv2.zip -d /tmp
  /tmp/aws/install --update
fi

export PATH="/usr/local/bin:${PATH}"
echo "Using aws at: $(command -v aws) -> $(aws --version 2>&1 || true)"

# ---- fetch MONGODB_URI from Secrets Manager if not provided ----
if [ -z "${MONGODB_URI:-}" ] || [ "${MONGODB_URI}" = "null" ]; then
  echo "Fetching MONGODB_URI from Secrets Manager (icu/mongodb_uri)..."
  MONGODB_URI=$(aws secretsmanager get-secret-value \
    --secret-id icu/mongodb_uri \
    --region "${AWS_REGION}" \
    --query SecretString --output text 2>/dev/null || true)

  if [ -z "${MONGODB_URI}" ]; then
    echo "Warning: MONGODB_URI not found in Secrets Manager and not provided. Service will start without DB connection."
  else
    echo "Fetched MongoDB URI."
  fi
else
  echo "MONGODB_URI provided in env (SSM)."
fi

# ---- write environment file for systemd (safe quoting) ----
ENVFILE="/etc/fastapi.env"
echo "Writing environment file ${ENVFILE} (owner root:root, mode 600)"
umask 077
cat > "${ENVFILE}" <<EOF
MONGODB_URI='${MONGODB_URI}'
S3_BUCKET='${S3_BUCKET}'
UVICORN_MODULE='${UVICORN_MODULE}'
UVICORN_WORKERS='${UVICORN_WORKERS}'
EOF
chmod 600 "${ENVFILE}"
chown root:root "${ENVFILE}"

# ---- create appuser if missing ----
id -u appuser >/dev/null 2>&1 || useradd -m -s /bin/bash appuser

# ---- clone or update repo (idempotent) ----
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

# ---- setup python venv and install deps ----
sudo -u appuser bash -lc '
  set -e
  cd /home/appuser/app || exit 0
  python3 -m venv venv || true
  source venv/bin/activate
  pip install --upgrade pip
  if [ -f requirements.txt ]; then
    pip install -r requirements.txt
  else
    pip install uvicorn
  fi
'

# ---- download model from S3 with retries (if S3_BUCKET set) ----
if [ -n "${S3_BUCKET}" ]; then
  sudo -u appuser mkdir -p /home/appuser/app/models
  echo "Downloading model from s3://${S3_BUCKET}/models/latest_model.pkl (with retries)..."
  n=0
  until [ "$n" -ge 5 ]; do
    if aws s3 cp "s3://${S3_BUCKET}/models/latest_model.pkl" /home/appuser/app/models/latest_model.pkl; then
      echo "Model downloaded."
      break
    fi
    n=$((n+1))
    echo "Retry $n/5 after failure..."
    sleep $((n*2))
  done
fi

# ---- write systemd unit using EnvironmentFile ----
cat > /etc/systemd/system/fastapi-app.service <<SERVICE
[Unit]
Description=FastAPI App
After=network.target

[Service]
User=appuser
WorkingDirectory=/home/appuser/app
EnvironmentFile=${ENVFILE}
ExecStart=/bin/bash -lc 'source /home/appuser/app/venv/bin/activate && exec uvicorn \$UVICORN_MODULE --host 0.0.0.0 --port 8000 --workers \$UVICORN_WORKERS'
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable fastapi-app

# ---- start/restart and show logs on error ----
if ! systemctl restart fastapi-app; then
  echo "systemctl restart failed, printing last 200 lines of journal"
  journalctl -u fastapi-app -n 200 --no-pager || true
  exit 1
fi

# ---- health check ----
echo "Waiting for health endpoint..."
for i in $(seq 1 20); do
  if curl -sSf http://127.0.0.1:8000/health >/dev/null 2>&1; then
    echo "health ok"
    echo "=== deploy.sh end: $(date -u) ==="
    exit 0
  fi
  echo "health try $i failed, sleeping..."
  sleep 2
done

echo "Health check failed; printing journal"
journalctl -u fastapi-app -n 200 --no-pager || true
echo "=== deploy.sh end: $(date -u) ==="
exit 1
