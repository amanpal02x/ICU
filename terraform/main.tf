terraform {
  required_providers {
    aws      = { source = "hashicorp/aws", version = ">= 4.0" }
    template = { source = "hashicorp/template", version = ">= 2.0" }
    tls      = { source = "hashicorp/tls", version = ">= 4.0" }
    local    = { source = "hashicorp/local", version = ">= 2.0" }
  }
  required_version = ">= 1.2.0"
}

provider "aws" {
  region = var.region
}

# -------------------------
# Generate SSH keypair (local) and upload public key to AWS
# -------------------------
resource "tls_private_key" "deployer" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "deployer_key" {
  key_name   = "${var.project_name}-key"
  public_key = tls_private_key.deployer.public_key_openssh
}

resource "local_file" "deployer_private_key" {
  content         = tls_private_key.deployer.private_key_pem
  filename        = "${path.module}/deployer_id_rsa.pem"
  file_permission = "0600"
}

# -------------------------
# S3 bucket for models
# -------------------------
resource "aws_s3_bucket" "model_bucket" {
  bucket = var.s3_bucket_name
  tags   = { Name = var.s3_bucket_name, Project = var.project_name }
}

# -------------------------
# Secrets Manager (MongoDB)
# -------------------------
resource "aws_secretsmanager_secret" "mongodb" {
  name = "${var.project_name}-mongodb-uri"
}

resource "aws_secretsmanager_secret_version" "mongodb_value" {
  secret_id     = aws_secretsmanager_secret.mongodb.id
  secret_string = var.mongodb_uri
}

data "aws_secretsmanager_secret_version" "mongodb" {
  secret_id = aws_secretsmanager_secret.mongodb.id
}

# -------------------------
# VPC / Subnet - use default
# -------------------------
data "aws_vpc" "default" { default = true }

# If user didn't supply a subnet, pick one from the default VPC
data "aws_subnets" "default_vpc_subnets" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

locals {
  selected_subnet_id = length(var.subnet_id) > 0 ? var.subnet_id : element(data.aws_subnets.default_vpc_subnets.ids, 0)
}

# -------------------------
# IAM role & instance profile for EC2
# -------------------------
resource "aws_iam_role" "ec2_role" {
  name = "icu-monitor-ec2-role-2"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [{ Action = "sts:AssumeRole", Effect = "Allow", Principal = { Service = "ec2.amazonaws.com" } }]
  })
}

resource "aws_iam_policy" "ec2_policy" {
  name = "${var.project_name}-ec2-policy"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      { Effect = "Allow", Action = ["s3:GetObject", "s3:ListBucket"], Resource = [aws_s3_bucket.model_bucket.arn, "${aws_s3_bucket.model_bucket.arn}/*"] },
      { Effect = "Allow", Action = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"], Resource = [aws_secretsmanager_secret.mongodb.arn] },
      { Effect = "Allow", Action = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"], Resource = ["*"] },
      { Effect = "Allow", Action = ["ssm:SendCommand", "ssm:GetCommandInvocation"], Resource = ["*"] } # optional: SSM usage
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_attach" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = aws_iam_policy.ec2_policy.arn
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "icu-monitor-instance-profile-2"
  role = aws_iam_role.ec2_role.name
}

# -------------------------
# Security Group (hardened)
# -------------------------
resource "aws_security_group" "ml_backend_sg" {
  name   = "${var.project_name}-sg"
  vpc_id = data.aws_vpc.default.id

  # SSH — only from your IP (configured via var.ssh_allowed_cidr)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_allowed_cidr]
    description = "SSH from allowed CIDR"
  }

  # Backend port (only API Gateway allowed)
  ingress {
    from_port   = var.backend_port
    to_port     = var.backend_port
    protocol    = "tcp"
    cidr_blocks = var.api_gateway_cidrs
    description = "Allow API Gateway to reach EC2 backend"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-sg" }
}

# -------------------------
# EC2 Instance (user-data installs CW agent & config, syncs models)
# -------------------------
data "aws_ami" "ubuntu" {
  most_recent = true

  owners = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "ml_instance" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  subnet_id                   = local.selected_subnet_id
  vpc_security_group_ids      = [aws_security_group.ml_backend_sg.id]
  key_name                    = aws_key_pair.deployer_key.key_name
  iam_instance_profile        = aws_iam_instance_profile.ec2_profile.name
  associate_public_ip_address = true

  user_data = templatefile("${path.module}/user-data.sh.tpl", {
    s3_bucket    = aws_s3_bucket.model_bucket.bucket
    secret_arn   = aws_secretsmanager_secret.mongodb.arn
    backend_port = tostring(var.backend_port)
    repo_url     = var.github_repo_url
    branch       = var.github_branch
    CWA_ZIP      = var.cwa_zip
    region       = var.region
    project_name = "icu-monitor"
    MONGO_URI    = data.aws_secretsmanager_secret_version.mongodb.secret_string
  })

  tags = { Name = "${var.project_name}-ml-instance" }
}

# Attach Elastic IP for a stable public IP
resource "aws_eip" "ml_eip" {
  instance   = aws_instance.ml_instance.id
  depends_on = [aws_instance.ml_instance]
}

# -------------------------
# CloudWatch Log Group (app logs)
# -------------------------
resource "aws_cloudwatch_log_group" "app_logs" {
  name              = "/aws/ec2/${aws_instance.ml_instance.id}/app"
  retention_in_days = var.log_retention_days
}

# -------------------------
# CloudWatch Agent config SSM parameter (optional)
# -------------------------
resource "aws_ssm_parameter" "cw_agent_config" {
  name  = "/${var.project_name}/cloudwatch-agent-config"
  type  = "String"
  value = file("${path.module}/cloudwatch-agent-config.json")
}

# -------------------------
# CloudWatch Dashboard
# -------------------------
resource "aws_cloudwatch_dashboard" "dashboard" {
  dashboard_name = "${var.project_name}-dashboard"
  dashboard_body = templatefile("${path.module}/cw-dashboard.json.tpl", {
    instance_id = aws_instance.ml_instance.id,
    region      = var.region
  })
}

# -------------------------
# Alarms: high CPU & disk
# -------------------------
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "${var.project_name}-HighCPU"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = var.cpu_alarm_threshold
  dimensions          = { InstanceId = aws_instance.ml_instance.id }
  alarm_description   = "Alarm when EC2 CPU > ${var.cpu_alarm_threshold}%"
}

resource "aws_cloudwatch_metric_alarm" "high_disk" {
  alarm_name          = "${var.project_name}-HighDisk"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DiskSpaceUtilization"
  namespace           = "CWAgent"
  period              = 300
  statistic           = "Average"
  threshold           = var.disk_alarm_threshold
  dimensions          = { InstanceId = aws_instance.ml_instance.id, path = "/", filesystem = "root" }
  alarm_description   = "Alarm when root disk > ${var.disk_alarm_threshold}% (CWAgent)"
}

# -------------------------
# API Gateway (HTTP Proxy) — simple
# -------------------------
resource "aws_apigatewayv2_api" "http_api" {
  name          = "${var.project_name}-http-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "http_integration" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "HTTP_PROXY"
  integration_method     = "ANY"
  integration_uri        = "http://${aws_instance.ml_instance.public_ip}:${var.backend_port}/"
  payload_format_version = "1.0"
}

resource "aws_apigatewayv2_route" "any_route" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.http_integration.id}"
}

resource "aws_apigatewayv2_stage" "default_stage" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true
}
