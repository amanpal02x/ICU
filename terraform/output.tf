############################################################
# outputs.tf
############################################################

output "api_gateway_invoke_url" {
  value       = aws_apigatewayv2_stage.default.invoke_url
  description = "Public HTTPS API endpoint"
}

output "nlb_dns_name" {
  value       = aws_lb.nlb.dns_name
  description = "Network Load Balancer DNS"
}

output "s3_bucket" {
  value       = aws_s3_bucket.model_bucket.bucket
  description = "S3 bucket storing your ML models"
}

output "ec2_private_ip" {
  value       = aws_instance.ml_server.private_ip
  description = "Private IP of the EC2 backend"
}

output "ec2_instance_id" {
  value       = aws_instance.ml_server.id
  description = "EC2 instance ID"
}

output "generated_private_key" {
  value     = tls_private_key.generated.private_key_pem
  sensitive = true
}

output "admin_cidr_final" {
  value = local.admin_cidr_final
}
