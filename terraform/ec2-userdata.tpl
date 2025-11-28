#!/bin/bash
set -e

yum update -y
amazon-linux-extras install docker -y
systemctl start docker
systemctl enable docker

curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscli.zip"
yum install -y unzip
unzip awscli.zip
./aws/install

ECR_REGISTRY="${ecr_registry}"
ECR_REPO="${ecr_repo}"
AWS_REGION="${aws_region}"

aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

mkdir -p /opt/app/ICU
cd /opt/app/ICU

cat > docker-compose.yml <<EOF
version: "3.9"

services:
  backend:
    image: $ECR_REGISTRY/$ECR_REPO:latest
    ports:
      - "${app_port}:${app_port}"
    restart: always
EOF

docker compose up -d
