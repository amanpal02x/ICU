output "ec2_public_ip" {
  description = "Public IP (Elastic IP) of the EC2 instance"
  value       = aws_eip.app_eip.public_ip
}

output "api_gateway_endpoint" {
  description = "HTTPS endpoint (API Gateway) that forwards to EC2"
  value       = aws_apigatewayv2_api.httpapi.api_endpoint
}

output "s3_bucket" {
  description = "S3 bucket for models & scripts"
  value       = aws_s3_bucket.models.bucket
}
