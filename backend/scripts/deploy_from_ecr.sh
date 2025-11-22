#!/usr/bin/env bash
set -euo pipefail

IMAGE_TAG="${1:-latest}"

AWS_REGION="us-east-2"
AWS_ACCOUNT_ID="601559288497"
ECR_REPO="icu-backend"
CONTAINER_NAME="icu-backend"
APP_PORT=8000

echo "Deploying image tag: ${IMAGE_TAG}"

# Login to ECR (instance must have IAM perms for ECR)
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:${IMAGE_TAG}"

echo "Pulling image ${IMAGE_URI}..."
docker pull "${IMAGE_URI}"

echo "Stopping old container if exists..."
docker stop "${CONTAINER_NAME}" || true
docker rm "${CONTAINER_NAME}" || true

echo "Starting new container..."
docker run -d \
  --name "${CONTAINER_NAME}" \
  -p ${APP_PORT}:8000 \
  --restart unless-stopped \
  "${IMAGE_URI}"

echo "Deploy complete."
