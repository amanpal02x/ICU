resource "tls_private_key" "generated" {
  algorithm = "ED25519"
}

resource "aws_key_pair" "deployer" {
  key_name   = "${local.name_prefix}-key"
  public_key = tls_private_key.generated.public_key_openssh
}
