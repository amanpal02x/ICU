#!/usr/bin/env bash
# scripts/deploy.sh
# Usage (CI): ./scripts/deploy.sh <EC2_PUBLIC_IP>
# This script SSHes into the EC2 instance and triggers the server-side deploy helper,
# then waits for a health-check endpoint to become available. On failure, it fetches
# journal logs for debugging.

set -euo pipefail

EC2_IP="${1:-}"
SSH_KEY="${SSH_KEY:-~/.ssh/deploy_key}"
SSH_USER="${SSH_USER:-ubuntu}"
SERVICE_NAME="${SERVICE_NAME:-icu-backend}"       # matches systemd unit created by the template
APP_PORT="${APP_PORT:-8000}"                      # default port; override via env or CI
HEALTH_PATH="${HEALTH_PATH:-/health}"             # endpoint to check; change to /health or /
HEALTH_RETRIES="${HEALTH_RETRIES:-12}"            # how many times to check
HEALTH_INTERVAL="${HEALTH_INTERVAL:-5}"           # seconds between checks
SSH_OPTIONS="-o StrictHostKeyChecking=no -o ConnectTimeout=10 -o ServerAliveInterval=30"

if [ -z "$EC2_IP" ]; then
  echo "Usage: $0 <EC2_PUBLIC_IP>"
  exit 2
fi

echo "==> Deploy: invoking remote helper on ${EC2_IP}"

# run the deploy helper on the server (must already exist as /usr/local/bin/deploy_pull_restart.sh)
ssh ${SSH_OPTIONS} -i "${SSH_KEY}" "${SSH_USER}@${EC2_IP}" "sudo /usr/local/bin/deploy_pull_restart.sh" || {
  echo "Remote deploy helper failed. Attempting to gather logs..."
  ssh ${SSH_OPTIONS} -i "${SSH_KEY}" "${SSH_USER}@${EC2_IP}" "sudo journalctl -u ${SERVICE_NAME} -n 200 --no-pager" || true
  exit 1
}

echo "==> Remote deploy helper completed — waiting for service to become healthy..."

# Wait for health endpoint
COUNTER=0
URL="http://${EC2_IP}:${APP_PORT}${HEALTH_PATH}"
while [ "$COUNTER" -lt "$HEALTH_RETRIES" ]; do
  if curl -sf --max-time 5 "$URL" >/dev/null 2>&1; then
    echo "==> Service is healthy at $URL"
    exit 0
  fi
  echo "Waiting for health (attempt $((COUNTER+1))/$HEALTH_RETRIES)..."
  COUNTER=$((COUNTER+1))
  sleep "$HEALTH_INTERVAL"
done

# If we get here, health check failed. Print service status and recent logs.
echo "ERROR: Service did not become healthy within $((HEALTH_RETRIES * HEALTH_INTERVAL))s."
echo "==> Fetching systemctl status and recent journal logs for ${SERVICE_NAME}:"
ssh ${SSH_OPTIONS} -i "${SSH_KEY}" "${SSH_USER}@${EC2_IP}" "sudo systemctl status ${SERVICE_NAME} --no-pager -l" || true
ssh ${SSH_OPTIONS} -i "${SSH_KEY}" "${SSH_USER}@${EC2_IP}" "sudo journalctl -u ${SERVICE_NAME} -n 400 --no-pager -o cat" || true

exit 1
