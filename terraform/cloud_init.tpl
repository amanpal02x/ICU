#!/bin/bash
set -e
apt-get update -y
apt-get install -y git python3 python3-venv python3-pip awscli curl

HOME_DIR="/home/ubuntu"
cd $HOME_DIR

if [ ! -d "$HOME_DIR/ICU" ]; then
  sudo -u ubuntu git clone https://github.com/amanpal02x/ICU ICU || true
else
  cd $HOME_DIR/ICU
  sudo -u ubuntu git fetch --all || true
  sudo -u ubuntu git reset --hard origin/main || true
  sudo -u ubuntu git pull origin main || true
fi

cd $HOME_DIR/ICU/backend || exit 0
python3 -m venv venv || true
source venv/bin/activate
if [ -f requirements.txt ]; then
  pip install --upgrade pip
  pip install -r requirements.txt || true
fi

# Sync models into backend/models/
mkdir -p $HOME_DIR/ICU/backend/models
aws s3 sync s3://ml-model-icu-601559/models/ $HOME_DIR/ICU/backend/models/ || true

# Create run script (FastAPI main:app)
cat > $HOME_DIR/run_backend.sh <<'RUNSH'
#!/bin/bash
set -e
cd /home/ubuntu/ICU/backend || exit 0
source venv/bin/activate
exec uvicorn main:app --host 0.0.0.0 --port 8000
RUNSH
chmod +x $HOME_DIR/run_backend.sh
chown ubuntu:ubuntu $HOME_DIR/run_backend.sh

# systemd service
cat > /etc/systemd/system/ml-backend.service <<'SERVICE'
[Unit]
Description=ML Backend (FastAPI) service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/ICU/backend
ExecStart=/home/ubuntu/run_backend.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable ml-backend.service
systemctl start ml-backend.service

chown -R ubuntu:ubuntu $HOME_DIR/ICU || true
