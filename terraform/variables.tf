variable "region" {
  type    = string
  default = "us-east-2"
}

variable "admin_cidr" {
  description = "CIDR allowed to SSH into EC2 instance"
  type        = string
  default     = "203.0.113.0/24"
}

variable "key_name" {
  type    = string
  default = "icu-deployer"
}

variable "instance_type" {
  type    = string
  default = "m7i-flex.large"
}

variable "backend_port" {
  type    = number
  default = 8000
}

variable "s3_bucket_prefix" {
  type    = string
  default = "icu-models"
}

variable "git_repo_url" {
  type    = string
  default = "https://github.com/amanpal02x/ICU"
}

variable "git_branch" {
  type    = string
  default = "main"
}
variable "project_name" {
  description = "Name of the project"
  type        = string
}
