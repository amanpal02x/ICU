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

apt update -y
apt install -y python3 python3-pip python3-venv git awscli

# Clone your repo
mkdir -p /opt/app
git clone https://github.com/amanpal02x/ICU /opt/app
cd /opt/app/backend

# Install Python dependencies
pip3 install -r requirements.txt

# Install FastAPI server tools
pip3 install uvicorn gunicorn

# Download ML model from S3
mkdir -p /opt/app/model
aws s3 cp s3://${aws_s3_bucket.model_bucket.bucket}/model.pkl /opt/app/model/model.pkl --region ${var.aws_region}

# Export environment variables
echo "export MONGO_URI=${var.mongodb_uri}" >> /etc/profile

# Create systemd service
cat <<EOT > /etc/systemd/system/fastapi.service
[Unit]
Description=FastAPI Service
After=network.target

[Service]
User=root
WorkingDirectory=/opt/app/backend
Environment="MONGO_URI=${var.mongodb_uri}"
ExecStart=/usr/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOT

# Start service
systemctl daemon-reload
systemctl enable fastapi
systemctl start fastapi
EOF
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
}

# resource "aws_lb_listener" "http" {
#   load_balancer_arn = aws_lb.app_lb.arn
#   port              = 80
#   protocol          = "HTTP"

#   default_action {
#     type = "redirect"

#     redirect {
#       port        = "443"
#       protocol    = "HTTPS"
#       status_code = "HTTP_301"
#     }
#   }
# }

# resource "aws_acm_certificate" "cert" {
#   domain_name       = var.domain_name
#   validation_method = "DNS"
# }

# resource "aws_route53_record" "cert_validation" {
#   name    = aws_acm_certificate.cert.domain_validation_options[0].resource_record_name
#   type    = aws_acm_certificate.cert.domain_validation_options[0].resource_record_type
#   zone_id = var.hosted_zone_id
#   records = [aws_acm_certificate.cert.domain_validation_options[0].resource_record_value]
#   ttl     = 60
# }

# resource "aws_acm_certificate_validation" "cert_validated" {
#   certificate_arn         = aws_acm_certificate.cert.arn
#   validation_record_fqdns = [aws_route53_record.cert_validation.fqdn]
# }

# resource "aws_lb_listener" "https" {
#   load_balancer_arn = aws_lb.app_lb.arn
#   port              = 443
#   protocol          = "HTTPS"
#   ssl_policy        = "ELBSecurityPolicy-2016-08"
#   certificate_arn   = aws_acm_certificate_validation.cert_validated.certificate_arn

#   default_action {
#     type             = "forward"
#     target_group_arn = aws_lb_target_group.tg.arn
#   }
# }

resource "aws_lb_target_group_attachment" "attach_ec2" {
  target_group_arn = aws_lb_target_group.tg.arn
  target_id        = aws_instance.backend.id
  port             = 8000
}



# # ROUTE 53 — DOMAIN → ALB

# resource "aws_route53_record" "domain_record" {
#   zone_id = var.hosted_zone_id
#   name    = var.domain_name
#   type    = "A"

#   alias {
#     name                   = aws_lb.app_lb.dns_name
#     zone_id                = aws_lb.app_lb.zone_id
#     evaluate_target_health = true
#   }
# }

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

