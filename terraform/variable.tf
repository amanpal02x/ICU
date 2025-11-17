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

variable "ami_id" {
  description = "Ubuntu AMI ID for us-east-2"
  default     = "ami-0f5fcdfbd140e4ab7"
}

variable "key_pair" {
  description = "EC2 key pair name"
  type        = string
}

variable "aws_region" {
  default = "us-east-2"
}

