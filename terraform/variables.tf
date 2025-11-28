variable "aws_region" {
  type    = string
  default = "us-east-2"
}

variable "key_name" {
  type    = string
  default = "icu-key"
}

variable "public_key_path" {
  type    = string
  default = "~/.ssh/id_rsa.pub"
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}

variable "ecr_repo_name" {
  type    = string
  default = "icu-backend"
}

variable "app_port" {
  type    = number
  default = 8000
}
