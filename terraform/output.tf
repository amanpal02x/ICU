############################################################
# outputs.tf
############################################################

output "nlb_dns_name" {
  value       = aws_lb.nlb.dns_name
  description = "Network Load Balancer DNS (public)"
}

output "api_gateway_invoke_url" {
  value       = aws_apigatewayv2_stage.default.invoke_url
  description = "API Gateway public HTTPS endpoint"
}

output "s3_bucket_name" {
  value       = aws_s3_bucket.model_bucket.bucket
  description = "S3 bucket where model files are stored"
}

output "ec2_public_ip" {
  value       = aws_eip.ec2_eip.public_ip
  description = "Elastic IP assigned to the EC2 instance (public IP)"
}

output "ec2_private_ip" {
  value       = aws_instance.ml_server.private_ip
  description = "Private IP of the EC2 backend"
}

output "ec2_instance_id" {
  value       = aws_instance.ml_server.id
  description = "EC2 instance ID"
}

output "uploaded_image_path" {
  value       = "/mnt/data/5b2c6bec-eda4-453d-82b6-af838bdd8e9d.png"
  description = "Local uploaded screenshot path (for reference)"
}
