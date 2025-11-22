#!/usr/bin/env bash
# Usage: ./deploy.sh <ec2_ip>
set -e
EC2_IP="$1"
if [ -z "$EC2_IP" ]; then
  echo "USAGE: $0 <ec2_public_ip>"
  exit 2
fi

ssh -o StrictHostKeyChecking=no -i ~/.ssh/deploy_key ubuntu@${EC2_IP} "sudo /usr/local/bin/deploy_pull_restart.sh"
