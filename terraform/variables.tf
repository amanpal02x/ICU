############################################################
# variables.tf
############################################################

variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-west-2"
}

variable "aws_account_id" {
  description = "Your AWS account ID"
  type        = string
}

variable "project_name" {
  description = "Name prefix for all resources"
  type        = string
  default     = "icu-backend"
}

variable "s3_bucket_prefix" {
  description = "Prefix used for S3 bucket naming"
  type        = string
  default     = "ml-model-icu"
}

variable "github_repo" {
  description = "URL of your GitHub repo"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "m7i-flex.large"
}

variable "backend_port" {
  description = "Port your FastAPI backend listens on"
  type        = number
  default     = 8000
}

variable "backend_start_cmd" {
  description = "Command to start FastAPI backend"
  type        = string
  default     = "uvicorn main:app --host 0.0.0.0 --port 8000"
}

variable "ssh_public_key" {
  description = "SSH public key for EC2 access"
  type        = string
}

variable "admin_cidr" {
  description = "CIDR allowed to SSH into EC2 (auto-detected if null)"
  type        = string
  default     = null
}
