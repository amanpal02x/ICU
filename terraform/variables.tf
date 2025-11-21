variable "project_name" {
  type    = string
  default = "icu-monitor"
}

variable "region" {
  type    = string
  default = "us-east-2"
}

variable "instance_type" {
  type    = string
  default = "m7i-flex.large"
}

variable "backend_port" {
  type    = number
  default = 8000
}

variable "s3_bucket_name" {
  type    = string
  default = "icu-model"
}

variable "mongodb_uri" {
  type      = string
  sensitive = true
  default   = "mongodb+srv://aman9118x4_db_user:aman2244@icu.7i4jmmj.mongodb.net/?appName=ICU"
}

variable "ssh_public_key" {
  type    = string
  default = "" # leave empty to auto-generate a keypair
}

variable "ssh_allowed_cidr" {
  type    = string
  default = "203.0.113.5/32"
}

variable "github_repo_url" {
  type    = string
  default = "https://github.com/amanpal02x/ICU"
}

variable "github_branch" {
  type    = string
  default = "main"
}

variable "log_retention_days" {
  type    = number
  default = 14
}

variable "cpu_alarm_threshold" {
  type    = number
  default = 80
}

variable "disk_alarm_threshold" {
  type    = number
  default = 80
}

variable "api_gateway_cidrs" {
  type    = list(string)
  default = ["0.0.0.0/0"]
}

variable "cwa_zip" {
  description = "S3 object key or filename for the CloudWatch Agent zip that user-data will download/install"
  type        = string
  default     = "cwa-agent.zip"
}

variable "subnet_id" {
  description = "Subnet id to launch EC2 into. Leave empty to auto-select."
  type        = string
  default     = ""
}
