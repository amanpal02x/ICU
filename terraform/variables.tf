
variable "aws_account_id" {
  type    = string
  default = "601559288497"
}

variable "aws_region" {
  type    = string
  default = "us-west-2"
}

variable "project_name" {
  type    = string
  default = "ml-backend"
}

variable "instance_type" {
  type    = string
  default = "m7i-flex.large"
}

variable "github_repo" {
  type    = string
  default = "https://github.com/amanpal02x/ICU"
}

variable "mongodb_url" {
  type    = string
  default = "mongodb+srv://aman9118x4_db_user:aman2244@icu.7i4jmmj.mongodb.net/?appName=ICU"
}

variable "s3_bucket_prefix" {
  type    = string
  default = "ml-model-bucket-icu"
}

variable "backend_port" {
  type    = number
  default = 8000
}

variable "backend_start_cmd" {
  type        = string
  default     = "uvicorn main:app --host 0.0.0.0 --port 8000"
  description = "Command systemd will run to start your FastAPI app (main:app)."
}

# OIDC / JWT (for real OIDC issuer)
variable "oidc_issuer" {
  type        = string
  description = "OIDC issuer URL (e.g. https://accounts.google.com or https://<your-issuer>/.well-known/openid-configuration issuer)."
  default     = ""
}

variable "oidc_audience" {
  type        = string
  description = "Expected audience (client_id) for tokens issued by the OIDC provider."
  default     = ""
}

variable "admin_cidr" {
  type    = string
  default = "203.0.113.5/32" # <-- replace with your IP/32
}

variable "ssh_public_key" {
  type        = string
  description = "Public SSH key to access EC2"
}
