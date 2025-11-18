provider "aws" {
  region = "us-east-2"
}

# VPC + SUBNETS + IGW + ROUTING

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-2a"
  map_public_ip_on_launch = true
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "us-east-2b"
  map_public_ip_on_launch = true
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
}

resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.main.id
}

resource "aws_route" "public_route" {
  route_table_id         = aws_route_table.public_rt.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.igw.id
}

resource "aws_route_table_association" "a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_route_table_association" "b" {
  subnet_id      = aws_subnet.public_b.id
  route_table_id = aws_route_table.public_rt.id
}

# SECURITY GROUPS
# ALB Security Group
resource "aws_security_group" "alb_sg" {
  name   = "alb-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# EC2 Security Group
resource "aws_security_group" "ec2_sg" {
  name   = "ec2-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  # SSH for admin (you can restrict later)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}


###########################################
# IAM (EC2 → S3 access)
###########################################

resource "aws_iam_role" "ec2_role" {
  name = "ec2_s3_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "s3_read" {
  name = "s3_read_policy"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = [
        "s3:GetObject",
        "s3:ListBucket"
      ]
      Effect   = "Allow"
      Resource = "*"
    }]
  })
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "ec2_profile"
  role = aws_iam_role.ec2_role.name
}

# S3 BUCKET (Model Storage)

resource "aws_s3_bucket" "model_bucket" {
  bucket        = "icu-model"
  force_destroy = true
}

# EC2 INSTANCE (FASTAPI BACKEND)
resource "aws_instance" "backend" {
  ami                         = var.ami_id
  instance_type               = "c7i-flex.large"
  subnet_id                   = aws_subnet.public_a.id
  vpc_security_group_ids      = [aws_security_group.ec2_sg.id]
  iam_instance_profile        = aws_iam_instance_profile.ec2_profile.name
  associate_public_ip_address = true
  key_name                    = var.key_pair

  user_data = <<-EOF
#!/bin/bash
set -euo pipefail

# change to app dir
APP_DIR=/opt/app/ICU
BACKEND_DIR="$APP_DIR/backend"
VENV_DIR="$APP_DIR/venv"
MODEL_S3_BUCKET="${aws_s3_bucket.model_bucket.bucket}"
MODEL_KEY="vitals_model_tuned.joblib"
MODEL_LOCAL="$BACKEND_DIR/models/$MODEL_KEY"
ENV_FILE="$APP_DIR/.env"

echo ">>> ensure app directory exists and correct owner"
mkdir -p /opt/app
chown -R ubuntu:ubuntu /opt/app

# clone repo if missing
if [ ! -d "$APP_DIR" ]; then
  echo ">>> cloning repo into $APP_DIR"
  sudo -u ubuntu git clone https://github.com/amanpal02x/ICU.git "$APP_DIR"
else
  cd "$APP_DIR"
  sudo -u ubuntu git pull || true
fi

cd "$APP_DIR"

echo ">>> creating venv at $VENV_DIR (as ubuntu)"
sudo -u ubuntu python3 -m venv "$VENV_DIR"

echo ">>> upgrading pip and installing requirements (as ubuntu)"
sudo -u ubuntu "$VENV_DIR/bin/python" -m pip install --upgrade pip
if [ -f "$BACKEND_DIR/requirements.txt" ]; then
  sudo -u ubuntu "$VENV_DIR/bin/pip" install -r "$BACKEND_DIR/requirements.txt"
else
  echo "!! WARNING: $BACKEND_DIR/requirements.txt not found"
fi
# ensure uvicorn present
sudo -u ubuntu "$VENV_DIR/bin/pip" install uvicorn

# ensure backend/models exists
sudo -u ubuntu mkdir -p "$BACKEND_DIR/models"

# try to download model from S3 into expected path (harmless if fails)
echo ">>> attempting to download model from s3://$MODEL_S3_BUCKET/$MODEL_KEY"
if command -v aws >/dev/null 2>&1; then
  aws s3 cp "s3://$MODEL_S3_BUCKET/$MODEL_KEY" "$MODEL_LOCAL" --region ${var.aws_region} || echo "NOTE: s3 cp failed or object missing; continue"
  sudo chown ubuntu:ubuntu "$MODEL_LOCAL" || true
else
  echo "NOTE: aws cli not found or not configured; skip s3 model download"
fi

# create .env (safe overwrite)
cat > "$ENV_FILE" <<'EOL'
PORT=8000
DISABLE_DEV_RELOAD=true
USE_REAL_MONITOR_DATA=false
MONGO_URI="${var.mongodb_uri}"
EOL
chown ubuntu:ubuntu "$ENV_FILE"
chmod 600 "$ENV_FILE"

# write systemd unit that uses the venv python
echo ">>> writing systemd unit /etc/systemd/system/fastapi.service"
sudo tee /etc/systemd/system/fastapi.service > /dev/null <<'UNIT'
[Unit]
Description=ICU FastAPI (uvicorn) service
After=network.target

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=/opt/app/ICU/backend
EnvironmentFile=/opt/app/ICU/.env
ExecStart=/opt/app/ICU/venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNIT

# reload systemd and start service
echo ">>> reloading systemd and starting fastapi"
systemctl daemon-reload
systemctl enable fastapi
systemctl restart fastapi || (journalctl -u fastapi -n 200; exit 1)

# show status, logs, port, and run a local health check
echo
echo "===== SERVICE STATUS ====="
systemctl status fastapi --no-pager || true

echo
echo "===== LAST 120 LOG LINES (fastapi) ====="
journalctl -u fastapi -n 120 --no-pager || true

echo
echo "===== LISTENING SOCKETS (port 8000) ====="
ss -lntp | egrep ':8000\s' || true

echo
echo "===== LOCAL CURL /health ====="
curl -sS -D - http://127.0.0.1:8000/health || true

echo
echo ">>> Done. If service isn't 'active (running)', inspect the journal above."
EOF

  tags = {
    Name = "icu-backend"
  }
}

# ALB + HTTPS

resource "aws_lb" "app_lb" {
  name               = "icu-alb"
  load_balancer_type = "application"
  subnets            = [aws_subnet.public_a.id, aws_subnet.public_b.id]
  security_groups    = [aws_security_group.alb_sg.id]
}

resource "aws_lb_target_group" "tg" {
  name        = "icu-targets"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "instance"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/health"
    matcher             = "200-399"
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.app_lb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    # IF certificate ARN exists → redirect HTTP → HTTPS
    type = var.certificate_arn != "" ? "redirect" : "forward"

    # redirect block only used when certificate ARN exists
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }

    # forward only used when certificate ARN is empty
    forward {
      target_group {
        arn = aws_lb_target_group.tg.arn
      }
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}


resource "aws_lb_target_group_attachment" "attach_ec2" {
  target_group_arn = aws_lb_target_group.tg.arn
  target_id        = aws_instance.backend.id
  port             = 8000
}

resource "tls_private_key" "ec2_private_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "generated_key" {
  key_name   = "icu-ec2-key"
  public_key = tls_private_key.ec2_private_key.public_key_openssh
}

resource "local_file" "private_key_pem" {
  content  = tls_private_key.ec2_private_key.private_key_pem
  filename = "${path.module}/icu-ec2-key.pem"
}

# OIDC provider for GitHub Actions

resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]

  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1" # GitHub’s OIDC thumbprint
  ]
}
# IAM Role for GitHub Actions to assume

resource "aws_iam_role" "github_actions_role" {
  name = "GitHubActionsTerraformRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        },
        Action = "sts:AssumeRoleWithWebIdentity",
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          },
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:amanpal02x/ICU:ref:refs/heads/main"
          }
        }
      }
    ]
  })
}

###########################################
# S3 Permissions for the GitHub Actions role
###########################################

resource "aws_iam_role_policy" "github_s3_policy" {
  name = "GitHubActionsS3Policy"
  role = aws_iam_role.github_actions_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.model_bucket.arn,
          "${aws_s3_bucket.model_bucket.arn}/*"
        ]
      }
    ]
  })
}
