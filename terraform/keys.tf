resource "tls_private_key" "generated" {
  algorithm = "ED25519"
}

resource "aws_key_pair" "deployer" {
  key_name   = "${local.name_prefix}-key"
  public_key = tls_private_key.generated.public_key_openssh
}

output "generated_private_key" {
  value     = tls_private_key.generated.private_key_openssh
  sensitive = true
}
