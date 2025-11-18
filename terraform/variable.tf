variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-2"
}

variable "project_name" {
  description = "Name prefix for resources"
  type        = string
  default     = "icu-monitor"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "c7i-flex.large"
}

variable "s3_bucket" {
  description = "S3 bucket name to store model files (must be unique or created elsewhere)"
  type        = string
  default     = "icu-model-bucket-unique-12345"
}

variable "git_repo" {
  description = "Git URL of backend repo"
  type        = string
  default     = "https://github.com/amanpal02x/ICU.git"
}

variable "mongodb_uri" {
  description = "MongoDB connection URI (set as a sensitive value; do NOT put credentials in repo)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "uvicorn_app_module" {
  description = "Uvicorn app module (module:app). Example: main:app"
  type        = string
  default     = "main:app"
}

variable "uvicorn_workers" {
  description = "Number of uvicorn workers"
  type        = number
  default     = 1
}

# Two options for SSH: provide an existing key pair name (recommended for CI),
# or provide raw public key material to create a key pair. If both empty, no keypair is attached.
variable "ssh_key_name" {
  description = "Name of an existing EC2 key pair to use (leave empty if creating a key from ssh_public_key)"
  type        = string
  default     = ""
}

variable "ssh_public_key" {
  description = "Full SSH public key text (e.g. contents of ~/.ssh/id_rsa.pub). If provided, Terraform will create an aws_key_pair."
  type        = string
  default     = ""
}
