terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = var.region
}

data "aws_availability_zones" "available" {}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# -------------------------------
# SSH KEY GENERATION
# -------------------------------
resource "tls_private_key" "deployer" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "deployer" {
  key_name   = var.key_name
  public_key = tls_private_key.deployer.public_key_openssh
}

# -------------------------------
# NETWORKING (VPC)
# -------------------------------
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags       = { Name = "icu-vpc" }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = data.aws_availability_zones.available.names[0]
  tags                    = { Name = "icu-subnet-public" }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
}

resource "aws_route_table_association" "public_assoc" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# -------------------------------
# SECURITY GROUPS
# -------------------------------
resource "aws_security_group" "ec2_sg" {
  name        = "icu-ec2-sg"
  vpc_id      = aws_vpc.main.id
  description = "Security group for EC2 backend"

  ingress {
    description = "App port (required by load balancer)"
    from_port   = var.backend_port
    to_port     = var.backend_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Allow SSH from admin"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.admin_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "icu-ec2-sg" }
}

# -------------------------------
# S3 + SQS for model updates
# -------------------------------
resource "aws_s3_bucket" "models_bucket" {
  bucket        = "${var.s3_bucket_prefix}-${random_id.bucket_suffix.hex}"
  force_destroy = true

  tags = {
    Name = "icu-models"
  }
}

resource "aws_s3_bucket_ownership_controls" "ownership" {
  bucket = aws_s3_bucket.models_bucket.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_versioning" "versioning" {
  bucket = aws_s3_bucket.models_bucket.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_sqs_queue" "models_notifications" {
  name = "icu-models-notifications"
}

resource "aws_sqs_queue_policy" "s3_to_sqs" {
  queue_url = aws_sqs_queue.models_notifications.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid       = "AllowS3SendMessage",
        Effect    = "Allow",
        Principal = "*",
        Action    = "SQS:SendMessage",
        Resource  = aws_sqs_queue.models_notifications.arn,
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_s3_bucket.models_bucket.arn
          }
        }
      }
    ]
  })
}

resource "aws_s3_bucket_notification" "bucket_notifications" {
  bucket = aws_s3_bucket.models_bucket.id

  depends_on = [
    aws_sqs_queue_policy.s3_to_sqs,
    aws_s3_bucket_ownership_controls.ownership
  ]

  queue {
    queue_arn     = aws_sqs_queue.models_notifications.arn
    events        = ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
    filter_prefix = "models/"
  }
}

# -------------------------------
# IAM ROLE FOR EC2
# -------------------------------
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
  name               = "icu-ec2-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json
}

resource "aws_iam_policy" "ec2_policy" {
  name = "icu-ec2-policy"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect   = "Allow",
        Action   = ["s3:ListBucket"],
        Resource = [aws_s3_bucket.models_bucket.arn]
      },
      {
        Effect   = "Allow",
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
        Resource = ["${aws_s3_bucket.models_bucket.arn}/*"]
      },
      {
        Effect   = "Allow",
        Action   = ["sqs:*"],
        Resource = [aws_sqs_queue.models_notifications.arn]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_attach" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = aws_iam_policy.ec2_policy.arn
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "icu-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

# -------------------------------
# EC2 INSTANCE
# -------------------------------
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

resource "aws_instance" "app" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.public.id
  associate_public_ip_address = true
  key_name                    = aws_key_pair.deployer.key_name
  vpc_security_group_ids      = [aws_security_group.ec2_sg.id]
  iam_instance_profile        = aws_iam_instance_profile.ec2_profile.name

  user_data = base64encode(
    templatefile("${path.module}/../scripts/install_and_run.sh.tpl", {
      repo_url      = var.git_repo_url
      branch        = var.git_branch
      app_port      = var.backend_port
      sqs_queue_url = aws_sqs_queue.models_notifications.id
      aws_region    = var.region
    })
  )

  tags = { Name = "icu-backend" }
}

# -------------------------------
# NLB (for API Gateway VPC Link)
# -------------------------------
resource "aws_lb" "nlb" {
  name               = "icu-nlb"
  load_balancer_type = "network"
  internal           = false
  subnets            = [aws_subnet.public.id]
}

resource "aws_lb_target_group" "tg" {
  name        = "icu-tg"
  port        = var.backend_port
  protocol    = "TCP"
  vpc_id      = aws_vpc.main.id
  target_type = "instance"

  health_check {
    protocol = "TCP"
    port     = var.backend_port
  }
}

resource "aws_lb_target_group_attachment" "tg_attach" {
  target_group_arn = aws_lb_target_group.tg.arn
  target_id        = aws_instance.app.id
  port             = var.backend_port
}

resource "aws_lb_listener" "listener" {
  load_balancer_arn = aws_lb.nlb.arn
  port              = 80
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tg.arn
  }
}

# -------------------------------
# API GATEWAY REST API (v1) + VPC LINK
# -------------------------------
resource "aws_api_gateway_rest_api" "rest_api" {
  name = "icu-rest-api"
}

resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.rest_api.id
  parent_id   = aws_api_gateway_rest_api.rest_api.root_resource_id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "proxy_method" {
  rest_api_id   = aws_api_gateway_rest_api.rest_api.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

# VPC LINK (for NLB)
resource "aws_api_gateway_vpc_link" "vpc_link" {
  name        = "icu-vpc-link"
  target_arns = [aws_lb.nlb.arn]
}

resource "aws_api_gateway_integration" "proxy_integration" {
  rest_api_id             = aws_api_gateway_rest_api.rest_api.id
  resource_id             = aws_api_gateway_resource.proxy.id
  http_method             = aws_api_gateway_method.proxy_method.http_method
  type                    = "HTTP"
  integration_http_method = "ANY"

  # NLB is TCP but forwards raw TCP to instances; include port in the URI so API Gateway can validate.
  uri = "http://${aws_lb.nlb.dns_name}:${var.backend_port}/{proxy}"

  connection_type = "VPC_LINK"
  connection_id   = aws_api_gateway_vpc_link.vpc_link.id
}

resource "aws_api_gateway_method_response" "proxy_200" {
  rest_api_id = aws_api_gateway_rest_api.rest_api.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy_method.http_method
  status_code = "200"
}

resource "aws_api_gateway_integration_response" "proxy_integration_200" {
  rest_api_id = aws_api_gateway_rest_api.rest_api.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy_method.http_method
  status_code = aws_api_gateway_method_response.proxy_200.status_code

  # make sure Terraform creates integration first
  depends_on = [aws_api_gateway_integration.proxy_integration]
}

resource "aws_api_gateway_deployment" "deployment" {
  rest_api_id = aws_api_gateway_rest_api.rest_api.id

  # Trigger redeploy on changes — use timestamp to ensure Terraform creates deployments after methods/integrations
  triggers = {
    redeploy = timestamp()
  }

  lifecycle {
    create_before_destroy = true
  }

  # ensure methods/integrations are present before deployment
  depends_on = [aws_api_gateway_method.proxy_method, aws_api_gateway_integration.proxy_integration]
}

resource "aws_api_gateway_stage" "prod" {
  rest_api_id   = aws_api_gateway_rest_api.rest_api.id
  deployment_id = aws_api_gateway_deployment.deployment.id
  stage_name    = "prod"
}
