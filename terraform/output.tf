output "ec2_public_ip" {
  description = "Public IP of the EC2 instance"
  value       = aws_instance.app.public_ip
}

output "api_gateway_endpoint" {
  description = "HTTPS endpoint (API Gateway) that forwards to EC2"
  value       = aws_apigatewayv2_api.httpapi.api_endpoint
}

output "s3_bucket_name" {
  description = "S3 bucket name for models"
  value       = aws_s3_bucket.models.bucket
}
