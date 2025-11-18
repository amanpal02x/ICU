variable "domain_name" {
  description = "Your domain"
  type        = string
}

variable "hosted_zone_id" {
  description = "Route53 Hosted Zone ID"
  type        = string
}

variable "mongodb_uri" {
  description = "MongoDB Atlas connection string"
  type        = string
}

variable "key_pair" {
  description = "EC2 key pair name"
  type        = string
}

variable "aws_region" {
  default = "us-east-2"
}

variable "certificate_arn" {
  description = "ACM certificate ARN to use for ALB HTTPS. Leave empty until you have a cert."
  type        = string
  default     = ""
}

variable "s3_bucket_prefix" {
  description = "Prefix for the S3 bucket used for storing ML models. Terraform will append a short random suffix to avoid global name collisions."
  type        = string
  default     = "icu-models"
}


variable "s3_bucket_name" {
  description = "(Optional) Fixed S3 bucket name to use. Leave empty to use s3_bucket_prefix + random suffix."
  type        = string
  default     = ""
}
