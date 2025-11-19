output "nlb_dns_name" {
  value       = aws_lb.nlb.dns_name
  description = "Network Load Balancer DNS (public)"
}

output "api_gateway_invoke_url" {
  value       = aws_apigatewayv2_stage.default.invoke_url
  description = "API Gateway public HTTPS endpoint"
}

output "s3_bucket" {
  value       = aws_s3_bucket.model_bucket.bucket
  description = "S3 bucket name for models."
}

output "ec2_private_ip" {
  value       = aws_instance.ml_server.private_ip
  description = "Private IP of the EC2 instance (in VPC)."
}

output "ec2_instance_id" {
  value       = aws_instance.ml_server.id
  description = "EC2 instance ID"
}

output "uploaded_image_path" {
  value       = "/mnt/data/d64af07a-14d8-4bf0-a723-b88a162c759c.png"
  description = "Uploaded screenshot path"
}
