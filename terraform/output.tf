output "alb_dns" {
  value = aws_lb.app_lb.dns_name
}

output "ec2_ip" {
  value = aws_instance.backend.public_ip
}

output "s3_bucket" {
  value = aws_s3_bucket.model_bucket.bucket
}
