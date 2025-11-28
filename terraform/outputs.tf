output "ec2_public_ip" {
  value = aws_instance.app.public_ip
}

output "ecr_repository_url" {
  value = aws_ecr_repository.icu.repository_url
}

output "github_actions_access_key" {
  value = aws_iam_access_key.gha_key.id
}

output "github_actions_secret_key" {
  value     = aws_iam_access_key.gha_key.secret
  sensitive = true
}
