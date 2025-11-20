output "ec2_public_ip" { value = aws_instance.ml_instance.public_ip }
output "api_gateway_url" { value = aws_apigatewayv2_api.http_api.api_endpoint }
output "cloudwatch_dashboard" { value = aws_cloudwatch_dashboard.dashboard.dashboard_name }
output "s3_bucket" { value = aws_s3_bucket.model_bucket.bucket }
output "secrets_arn" { value = aws_secretsmanager_secret.mongodb.arn }
