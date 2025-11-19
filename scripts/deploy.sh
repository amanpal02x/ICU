#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/home/ubuntu/ICU"
BACKEND_DIR="${REPO_DIR}/backend"
VENV_DIR="${BACKEND_DIR}/venv"
SERVICE_NAME="ml-backend.service"

echo "$(date) - Starting deploy script on EC2"

if [ ! -d "${REPO_DIR}" ]; then
  sudo -u ubuntu git clone "https://github.com/amanpal02x/ICU" "${REPO_DIR}" || true
fi

cd "${REPO_DIR}" || exit 1
sudo -u ubuntu git fetch --all || true
sudo -u ubuntu git reset --hard origin/main || true
sudo -u ubuntu git pull origin main || true

cd "${BACKEND_DIR}" || exit 0
if [ ! -d "${VENV_DIR}" ]; then
  python3 -m venv venv
fi
# shellcheck disable=SC1091
source "${VENV_DIR}/bin/activate"

if [ -f "requirements.txt" ]; then
  pip install --upgrade pip
  pip install -r requirements.txt || true
fi

# Sync models from S3 into backend/models/ (so your code can directly load them)
if [ -n "${S3_BUCKET:-}" ]; then
  mkdir -p "${BACKEND_DIR}/models"
  aws s3 sync "s3://${S3_BUCKET}/models/" "${BACKEND_DIR}/models/" || true
fi

# Restart systemd service to pick up code changes and new models
if systemctl is-enabled --quiet "${SERVICE_NAME}"; then
  systemctl restart "${SERVICE_NAME}"
  systemctl status "${SERVICE_NAME}" --no-pager || true
else
  systemctl enable "${SERVICE_NAME}"
  systemctl start "${SERVICE_NAME}"
  systemctl status "${SERVICE_NAME}" --no-pager || true
fi

echo "Deploy script finished at $(date)"
