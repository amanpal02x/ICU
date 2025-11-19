############################################################
# main.tf - Private EC2 behind NLB + API Gateway (VPC LINK)
# JWT authorizer DISABLED (for now)
# Patched: automatic admin CIDR detection (auto -> checkip.amazonaws.com)
# All var.admin_cidr occurrences replaced with local.admin_cidr_final
# Uploaded screenshot reference: /mnt/data/d64af07a-14d8-4bf0-a723-b88a162c759c.png
############################################################

terraform {
  required_version = ">= 1.2.0"
  required_providers {
    aws  = { source = "hashicorp/aws", version = ">= 5.0" }
    http = { source = "hashicorp/http", version = ">= 2.0" }
  }
}

provider "aws" {
  region = var.aws_region
}

####################
# Locals
####################
locals {
  name_prefix          = "${var.project_name}-${replace(var.aws_account_id, "/", "")}"
  bucket_name          = "${var.s3_bucket_prefix}-${substr(var.aws_account_id, 0, 6)}"
  initial_model_path   = "${path.module}/initial_model/model.pkl"
  initial_model_exists = fileexists(local.initial_model_path)

  # admin CIDR auto-detection (uses data.http.my_public_ip)
  admin_cidr_auto  = trimspace(data.http.my_public_ip.response_body) != "" ? "${trimspace(data.http.my_public_ip.response_body)}/32" : ""
  admin_cidr_final = (var.admin_cidr != null && var.admin_cidr != "") ? var.admin_cidr : local.admin_cidr_auto
}

####################
# Data sources
####################
data "aws_availability_zones" "available" {}

data "aws_ami" "ubuntu" {
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

# auto-detect caller public IP (used for admin CIDR if var not provided)
data "http" "my_public_ip" {
  url = "https://checkip.amazonaws.com/"
  request_headers = {
    "User-Agent" = "terraform"
  }
}

####################
# VPC, Subnets, IGW, Route Tables
####################
resource "aws_vpc" "main" {
  cidr_block           = "10.100.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = "${local.name_prefix}-vpc" }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.name_prefix}-igw" }
}

resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.100.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true
  tags                    = { Name = "${local.name_prefix}-public-a" }
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.100.2.0/24"
  availability_zone       = data.aws_availability_zones.available.names[1]
  map_public_ip_on_launch = true
  tags                    = { Name = "${local.name_prefix}-public-b" }
}

resource "aws_subnet" "private" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.100.10.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = false
  tags                    = { Name = "${local.name_prefix}-private" }
}

resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
  tags = { Name = "${local.name_prefix}-public-rt" }
}

resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_route_table_association" "public_b" {
  subnet_id      = aws_subnet.public_b.id
  route_table_id = aws_route_table.public_rt.id
}

####################
# Network ACL (public)
####################
resource "aws_network_acl" "public_nacl" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.name_prefix}-nacl" }
}

resource "aws_network_acl_rule" "allow_inbound_backend" {
  network_acl_id = aws_network_acl.public_nacl.id
  rule_number    = 100
  protocol       = "6"
  rule_action    = "allow"
  egress         = false
  cidr_block     = "0.0.0.0/0"
  from_port      = var.backend_port
  to_port        = var.backend_port
}

resource "aws_network_acl_rule" "allow_inbound_ssh" {
  network_acl_id = aws_network_acl.public_nacl.id
  rule_number    = 110
  protocol       = "6"
  rule_action    = "allow"
  egress         = false
  cidr_block     = local.admin_cidr_final
  from_port      = 22
  to_port        = 22
}

resource "aws_network_acl_rule" "allow_outbound_all" {
  network_acl_id = aws_network_acl.public_nacl.id
  rule_number    = 100
  protocol       = "-1"
  rule_action    = "allow"
  egress         = true
  cidr_block     = "0.0.0.0/0"
}

resource "aws_network_acl_association" "public_a_assoc" {
  subnet_id      = aws_subnet.public_a.id
  network_acl_id = aws_network_acl.public_nacl.id
}
resource "aws_network_acl_association" "public_b_assoc" {
  subnet_id      = aws_subnet.public_b.id
  network_acl_id = aws_network_acl.public_nacl.id
}

####################
# S3 bucket + conditional initial model upload (aws_s3_object)
####################
resource "aws_s3_bucket" "model_bucket" {
  bucket        = local.bucket_name
  force_destroy = true
  tags          = { Name = local.bucket_name }
}

resource "aws_s3_object" "initial_model" {
  count        = local.initial_model_exists ? 1 : 0
  bucket       = aws_s3_bucket.model_bucket.id
  key          = "models/initial_model.pkl"
  source       = local.initial_model_path
  etag         = local.initial_model_exists ? filemd5(local.initial_model_path) : null
  content_type = "application/octet-stream"
}

####################
# IAM: EC2 role with S3 + SSM
####################
resource "aws_iam_role" "ec2_role" {
  name = "${local.name_prefix}-ec2-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

data "aws_iam_policy_document" "ec2_s3_doc" {
  statement {
    actions = ["s3:GetObject", "s3:ListBucket", "s3:GetBucketLocation", "s3:PutObject"]
    resources = [
      aws_s3_bucket.model_bucket.arn,
      "${aws_s3_bucket.model_bucket.arn}/*"
    ]
    effect = "Allow"
  }
}

resource "aws_iam_policy" "ec2_s3_policy" {
  name   = "${local.name_prefix}-s3-policy"
  policy = data.aws_iam_policy_document.ec2_s3_doc.json
}

resource "aws_iam_role_policy_attachment" "attach_s3" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = aws_iam_policy.ec2_s3_policy.arn
}

resource "aws_iam_role_policy_attachment" "attach_ssm" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${local.name_prefix}-instance-profile"
  role = aws_iam_role.ec2_role.name
}

####################
# Security Group for EC2 (private)
####################
resource "aws_security_group" "ec2_sg" {
  name        = "${local.name_prefix}-sg"
  description = "EC2 SG in private subnet"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH from admin"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [local.admin_cidr_final]
  }

  ingress {
    description = "Backend port"
    from_port   = var.backend_port
    to_port     = var.backend_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name_prefix}-sg" }
}

####################
# Cloud-init (local_file) -> user_data uses the content
####################
resource "local_file" "cloud_init_tpl" {
  filename = "${path.module}/cloud_init.tpl"
  content  = <<-EOT
              #!/bin/bash
              set -e
              apt-get update -y
              apt-get install -y git python3 python3-venv python3-pip awscli curl

              HOME_DIR="/home/ubuntu"
              cd $HOME_DIR

              if [ ! -d "$HOME_DIR/ICU" ]; then
                sudo -u ubuntu git clone ${var.github_repo} ICU || true
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
              aws s3 sync s3://${aws_s3_bucket.model_bucket.bucket}/models/ $HOME_DIR/ICU/backend/models/ || true

              # Create run script (FastAPI main:app)
              cat > $HOME_DIR/run_backend.sh <<'RUNSH'
              #!/bin/bash
              set -e
              cd /home/ubuntu/ICU/backend || exit 0
              source venv/bin/activate
              exec ${var.backend_start_cmd}
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
              EOT
}

####################
# EC2 in private subnet
####################
resource "aws_instance" "ml_server" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  key_name                    = aws_key_pair.deployer.key_name
  subnet_id                   = aws_subnet.private.id
  vpc_security_group_ids      = [aws_security_group.ec2_sg.id]
  iam_instance_profile        = aws_iam_instance_profile.ec2_profile.name
  associate_public_ip_address = false

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  user_data = local_file.cloud_init_tpl.content

  tags = {
    Name = "${local.name_prefix}-ec2"
  }
}

####################
# NLB + target group + listener + attachment (NLB public)
####################
resource "aws_lb" "nlb" {
  name               = "${local.name_prefix}-nlb"
  internal           = false
  load_balancer_type = "network"
  subnet_mapping {
    subnet_id = aws_subnet.public_a.id
  }
  subnet_mapping {
    subnet_id = aws_subnet.public_b.id
  }
  tags = { Name = "${local.name_prefix}-nlb" }
}

resource "aws_lb_target_group" "tg" {
  name        = "${local.name_prefix}-tg"
  port        = var.backend_port
  protocol    = "TCP"
  vpc_id      = aws_vpc.main.id
  target_type = "instance"

  health_check {
    protocol            = "TCP"
    port                = var.backend_port
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
  tags = { Name = "${local.name_prefix}-tg" }
}

resource "aws_lb_listener" "nlb_listener" {
  load_balancer_arn = aws_lb.nlb.arn
  port              = var.backend_port
  protocol          = "TCP"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tg.arn
  }
}

resource "aws_lb_target_group_attachment" "tg_attach" {
  target_group_arn = aws_lb_target_group.tg.arn
  target_id        = aws_instance.ml_server.id
  port             = var.backend_port
}

####################
# API Gateway (HTTP API v2) + VPC LINK -> NLB
# JWT authorizer DISABLED
####################
resource "aws_apigatewayv2_api" "http_api" {
  name          = "${local.name_prefix}-http-api"
  protocol_type = "HTTP"
}

# Health Lambda (public)
resource "local_file" "health_lambda_py" {
  filename = "${path.module}/health_lambda.py"
  content  = <<-PY
              def lambda_handler(event, context):
                  return {
                      "statusCode": 200,
                      "headers": {"Content-Type": "application/json"},
                      "body": '{"status":"ok"}'
                  }
              PY
}

data "archive_file" "health_zip" {
  type        = "zip"
  source_file = local_file.health_lambda_py.filename
  output_path = "${path.module}/health_lambda.zip"
}

resource "aws_iam_role" "lambda_exec" {
  name = "${local.name_prefix}-lambda-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "health" {
  filename         = data.archive_file.health_zip.output_path
  function_name    = "${local.name_prefix}-health"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "health_lambda.lambda_handler"
  runtime          = "python3.9"
  publish          = true
  source_code_hash = data.archive_file.health_zip.output_base64sha256
  timeout          = 5
}

resource "aws_apigatewayv2_integration" "health_integration" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  integration_uri        = aws_lambda_function.health.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_lambda_permission" "apigw_invoke_health" {
  statement_id  = "AllowAPIGatewayInvokeHealth"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.health.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}

# VPC LINK to private subnet(s)
resource "aws_apigatewayv2_vpc_link" "vpc_link" {
  name               = "${local.name_prefix}-vpc-link"
  security_group_ids = [aws_security_group.ec2_sg.id]
  subnet_ids         = [aws_subnet.private.id]
  tags               = { Name = "${local.name_prefix}-vpc-link" }
}

# Integration to NLB using listener ARN (required for VPC_LINK)
resource "aws_apigatewayv2_integration" "nlb_integration" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "HTTP_PROXY"
  integration_method     = "ANY"
  connection_type        = "VPC_LINK"
  connection_id          = aws_apigatewayv2_vpc_link.vpc_link.id
  integration_uri        = aws_lb_listener.nlb_listener.arn
  payload_format_version = "1.0"
}

# Protected proxy route -> NLB (no authorizer attached)
resource "aws_apigatewayv2_route" "protected_route" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.nlb_integration.id}"
  # authorizer_id and authorization_type intentionally omitted (JWT disabled)
}

# Health route (public)
resource "aws_apigatewayv2_route" "health_route" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "GET /health"
  target    = "integrations/${aws_apigatewayv2_integration.health_integration.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true
}
