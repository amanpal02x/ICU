terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 4.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_availability_zones" "available" {}

# --- VPC / Subnet / IGW / Route ---
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags       = { Name = "${var.project_name}-vpc" }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true
  tags                    = { Name = "${var.project_name}-public-subnet" }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
}

resource "aws_route" "internet_access" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.igw.id
}

resource "aws_route_table_association" "public_assoc" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# --- Security Group ---
resource "aws_security_group" "app_sg" {
  name        = "${var.project_name}-sg"
  description = "Allow SSH and app port"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "FastAPI HTTP"
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-sg" }
}

# --- IAM Role & Instance Profile (assumes you have data/policies elsewhere; keep AmazonSSMManagedInstanceCore attachment) ---
data "aws_iam_policy_document" "ec2_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ec2_role" {
  name               = "${var.project_name}-ec2-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json
}

resource "aws_iam_role_policy_attachment" "ssm_managed" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy" "s3_read_policy" {
  name = "${var.project_name}-s3-read"
  role = aws_iam_role.ec2_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ],
        Effect = "Allow",
        Resource = [
          "arn:aws:s3:::${var.s3_bucket}",
          "arn:aws:s3:::${var.s3_bucket}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_instance_profile" "ec2_instance_profile" {
  name = "${var.project_name}-instance-profile"
  role = aws_iam_role.ec2_role.name
}

# --- Ubuntu 22.04 AMI ---
data "aws_ami" "ubuntu_2204" {
  most_recent = true
  owners      = ["099720109477"] # Canonical
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# --- Create AWS Key Pair only when ssh_public_key is provided ---
resource "aws_key_pair" "deployer" {
  count      = var.ssh_public_key != "" ? 1 : 0
  key_name   = "${var.project_name}-key"
  public_key = var.ssh_public_key
}

# --- EC2 instance (Ubuntu) ---
resource "aws_instance" "app" {
  ami                         = data.aws_ami.ubuntu_2204.id
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.app_sg.id]
  key_name                    = var.ssh_key_name != "" ? var.ssh_key_name : (var.ssh_public_key != "" ? aws_key_pair.deployer[0].key_name : null)
  iam_instance_profile        = aws_iam_instance_profile.ec2_instance_profile.name
  associate_public_ip_address = true
  tags = {
    Name = "${var.project_name}-ec2"
  }

  user_data = <<-EOF
    #!/bin/bash
    set -e
    DEBIAN_FRONTEND=noninteractive

    apt-get update -y
    apt-get upgrade -y
    apt-get install -y git python3 python3-venv python3-dev build-essential awscli unzip curl

    # ensure pip exists
    apt-get install -y python3-pip
    python3 -m pip install --upgrade pip virtualenv boto3

    # Install/enable SSM agent if not present
    if ! systemctl is-active --quiet snap.amazon-ssm-agent.amazon-ssm-agent; then
      snap install amazon-ssm-agent --classic || true
      systemctl enable --now snap.amazon-ssm-agent.amazon-ssm-agent.service || (apt-get install -y amazon-ssm-agent && systemctl enable --now amazon-ssm-agent)
    fi

    # Create app user
    id -u appuser >/dev/null 2>&1 || useradd -m -s /bin/bash appuser

    sudo -u appuser bash -lc '
      cd /home/appuser
      if [ ! -d app ]; then
        git clone --depth 1 ${var.git_repo} app || true
      else
        cd app && git fetch --all || true
      fi
      cd /home/appuser/app || true
      python3 -m venv venv || true
      source venv/bin/activate
      pip install --upgrade pip
      if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
    '

    # systemd service for FastAPI (uvicorn)
    cat > /etc/systemd/system/fastapi-app.service <<SERVICE
    [Unit]
    Description=FastAPI App (uvicorn) service
    After=network.target

    [Service]
    Type=simple
    User=appuser
    WorkingDirectory=/home/appuser/app
    Environment="MONGODB_URI=${var.mongodb_uri}"
    Environment="S3_BUCKET=${var.s3_bucket}"
    ExecStart=/bin/bash -lc 'source /home/appuser/app/venv/bin/activate && uvicorn ${var.uvicorn_app_module} --host 0.0.0.0 --port 8000 --workers ${var.uvicorn_workers}'
    Restart=always
    RestartSec=5
    LimitNOFILE=65536

    [Install]
    WantedBy=multi-user.target
    SERVICE

    systemctl daemon-reload
    systemctl enable --now fastapi-app || systemctl restart fastapi-app || true

    chown -R appuser:appuser /home/appuser
  EOF
}

# --- Elastic IP so instance public IP is stable ---
# Elastic IP so instance public IP is stable
resource "aws_eip" "app_eip" {
  instance = aws_instance.app.id
  tags = {
    Name = "${var.project_name}-eip"
  }
}

# S3 Bucket for model artifacts
resource "aws_s3_bucket" "models" {
  bucket        = var.s3_bucket
  force_destroy = true
  tags = {
    Name = "${var.project_name}-models"
  }
}

resource "aws_s3_bucket_public_access_block" "models_block" {
  bucket = aws_s3_bucket.models.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}



# --- API Gateway (HTTP API) to provide HTTPS endpoint that forwards to EC2 (via EIP) ---
resource "aws_apigatewayv2_api" "httpapi" {
  name          = "${var.project_name}-httpapi"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "proxy_to_ec2" {
  api_id               = aws_apigatewayv2_api.httpapi.id
  integration_type     = "HTTP_PROXY"
  integration_uri      = "http://${aws_eip.app_eip.public_ip}:8000"
  integration_method   = "ANY"
  timeout_milliseconds = 30000
}

resource "aws_apigatewayv2_route" "all" {
  api_id    = aws_apigatewayv2_api.httpapi.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.proxy_to_ec2.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.httpapi.id
  name        = "$default"
  auto_deploy = true
}
