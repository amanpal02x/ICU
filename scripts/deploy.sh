#!/usr/bin/env bash
set -euo pipefail

# Deploy script for EC2 (safe to run via SSM or manually)
# - clones/pulls repo as ubuntu user
# - ensures venv exists and installs requirements
# - syncs models from S3 into backend/models/
# - restarts the systemd service and performs a local /health check
#
# Uploaded screenshot (local path): /mnt/data/d0105f69-d89a-424d-ab91-9c75ef1d1cf7.png

REPO_URL="${REPO_URL:-https://github.com/amanpal02x/ICU}"
REPO_DIR="${REPO_DIR:-/home/ubuntu/ICU}"
BACKEND_DIR="${BACKEND_DIR:-${REPO_DIR}/backend}"
VENV_DIR="${VENV_DIR:-${BACKEND_DIR}/venv}"
SERVICE_NAME="${SERVICE_NAME:-ml-backend.service}"
GIT_BRANCH="${GIT_BRANCH:-main}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
S3_BUCKET="${S3_BUCKET:-}"   # expected to be provided as env var or secret in CI (S3 bucket name only)

log() { echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] $*"; }

log "Starting deploy script"
log "REPO_URL=${REPO_URL}"
log "REPO_DIR=${REPO_DIR}"
log "BACKEND_DIR=${BACKEND_DIR}"
log "SERVICE_NAME=${SERVICE_NAME}"
[ -z "${S3_BUCKET}" ] || log "S3_BUCKET=${S3_BUCKET}"

# Ensure git and python are available (best-effort)
if ! command -v git >/dev/null 2>&1; then
  log "git not found; attempting apt-get install git (may require sudo privileges)"
  apt-get update -y && apt-get install -y git || log "apt-get install git failed; continuing"
fi

if ! command -v python3 >/dev/null 2>&1; then
  log "python3 not found; attempting apt-get install python3 python3-venv python3-pip"
  apt-get update -y && apt-get install -y python3 python3-venv python3-pip || {
    log "python install failed; exiting"
    exit 1
  }
fi

# Clone or update the repo as ubuntu user
if [ ! -d "${REPO_DIR}" ]; then
  log "Repo not found at ${REPO_DIR}, cloning..."
  sudo -u ubuntu mkdir -p "$(dirname "${REPO_DIR}")"
  sudo -u ubuntu git clone --branch "${GIT_BRANCH}" "${REPO_URL}" "${REPO_DIR}" || {
    log "git clone failed"
  }
fi

cd "${REPO_DIR}" || { log "Failed to cd ${REPO_DIR}"; exit 1; }

log "Fetching latest code (branch ${GIT_BRANCH})"
sudo -u ubuntu git fetch --all --prune || log "git fetch failed"
sudo -u ubuntu git checkout "${GIT_BRANCH}" || log "git checkout ${GIT_BRANCH} failed"
sudo -u ubuntu git reset --hard "origin/${GIT_BRANCH}" || log "git reset --hard failed"
sudo -u ubuntu git pull origin "${GIT_BRANCH}" || log "git pull origin ${GIT_BRANCH} failed"

# Prepare backend venv & install deps as ubuntu user
if [ -d "${BACKEND_DIR}" ]; then
  cd "${BACKEND_DIR}" || { log "Failed to cd ${BACKEND_DIR}"; exit 0; }

  if [ ! -d "${VENV_DIR}" ]; then
    log "Creating python venv at ${VENV_DIR}"
    sudo -u ubuntu python3 -m venv "${VENV_DIR}"
  fi

  # Use pip from venv to install dependencies (run as ubuntu so permissions are correct)
  VENV_PIP="${VENV_DIR}/bin/pip"
  VENV_PY="${VENV_DIR}/bin/python"
  if [ -f "requirements.txt" ]; then
    log "Installing Python requirements (if any) via ${VENV_PIP}"
    sudo -u ubuntu "${VENV_PIP}" install --upgrade pip setuptools wheel || log "pip upgrade failed"
    sudo -u ubuntu "${VENV_PIP}" install -r requirements.txt || log "pip install -r requirements.txt (some packages may have failed)"
  else
    log "No requirements.txt found in ${BACKEND_DIR}"
  fi
else
  log "Backend directory ${BACKEND_DIR} not found; skipping venv & deps"
fi

# Sync models from S3 into backend/models/ if bucket provided
if [ -n "${S3_BUCKET}" ]; then
  if ! command -v aws >/dev/null 2>&1; then
    log "aws CLI not found; attempting to install (apt-get). This may fail if no internet."
    apt-get update -y && apt-get install -y awscli || log "awscli install failed; skipping s3 sync"
  fi

  if command -v aws >/dev/null 2>&1; then
    mkdir -p "${BACKEND_DIR}/models"
    log "Syncing models from s3://${S3_BUCKET}/models/ to ${BACKEND_DIR}/models/"
    # run as ubuntu so files are owned by ubuntu user
    sudo -u ubuntu aws s3 sync "s3://${S3_BUCKET}/models/" "${BACKEND_DIR}/models/" || log "aws s3 sync returned non-zero status"
    log "Finished s3 model sync"
  else
    log "Skipping s3 model sync since aws CLI is not available"
  fi
else
  log "S3_BUCKET env var not set; skipping model sync"
fi

# Ensure proper ownership of repo files
log "Fixing ownership to ubuntu:ubuntu for ${REPO_DIR}"
chown -R ubuntu:ubuntu "${REPO_DIR}" || log "chown failed (non-fatal)"

# Restart (or enable+start) the systemd service so it picks up new code/models
if systemctl list-units --full -all | grep -q "${SERVICE_NAME}"; then
  log "Restarting ${SERVICE_NAME}"
  systemctl daemon-reload || true
  systemctl restart "${SERVICE_NAME}" || {
    log "systemctl restart failed; attempting to start"
    systemctl start "${SERVICE_NAME}" || log "systemctl start failed"
  }
else
  log "Service ${SERVICE_NAME} not found in systemd - attempting enable & start"
  systemctl daemon-reload || true
  systemctl enable "${SERVICE_NAME}" || log "systemctl enable failed"
  systemctl start "${SERVICE_NAME}" || log "systemctl start failed"
fi

# Give the service a few seconds to boot, then run a local health check against the backend
sleep 3
LOCAL_HEALTH_URL="http://127.0.0.1:${BACKEND_PORT}/health"

log "Checking local health endpoint: ${LOCAL_HEALTH_URL}"
if command -v curl >/dev/null 2>&1; then
  set +e
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${LOCAL_HEALTH_URL}" || echo "000")
  set -e
  if [ "${HTTP_STATUS}" = "200" ]; then
    log "Local health check succeeded (200)"
  else
    log "Local health check returned ${HTTP_STATUS} (not 200). Service logs follow (journalctl --no-pager -u ${SERVICE_NAME}):"
    journalctl --no-pager -u "${SERVICE_NAME}" -n 200 || true
  fi
else
  log "curl not available; skipping local health check"
fi

log "Deploy script finished at $(date)"
exit 0
