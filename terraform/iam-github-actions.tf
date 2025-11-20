# iam-github-actions.tf
# Minimal IAM user + policy + access key for GitHub Actions

variable "github_actions_user" {
  type        = string
  default     = "github-actions-icu"
  description = "IAM username for GitHub Actions"
}

# Either set this var, or the code will reference the existing aws_s3_bucket resource if present
variable "s3_bucket_name" {
  type        = string
  default     = "ml-model-icu-601559"
  description = "S3 bucket name used by the workflow"
}

locals {
  policy_name = "${var.github_actions_user}-policy"
}

# 1) IAM user
resource "aws_iam_user" "github_actions_user" {
  name = var.github_actions_user
  tags = {
    created_by = "terraform"
  }
}

# 2) Build S3 ARN strings (use var.s3_bucket_name)
locals {
  s3_bucket_arn     = "arn:aws:s3:::${var.s3_bucket_name}"
  s3_bucket_objects = "arn:aws:s3:::${var.s3_bucket_name}/*"
}

# 3) IAM policy document
data "aws_iam_policy_document" "github_actions_policy_doc" {
  statement {
    sid    = "S3ModelBucketAccess"
    effect = "Allow"

    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:ListBucket",
      "s3:DeleteObject"
    ]

    resources = [
      local.s3_bucket_arn,
      local.s3_bucket_objects
    ]
  }

  statement {
    sid    = "SSMAndEC2"
    effect = "Allow"

    actions = [
      "ssm:SendCommand",
      "ssm:GetCommandInvocation",
      "ssm:ListCommandInvocations",
      "ssm:DescribeInstanceInformation",
      "ec2:DescribeInstances",
      "ec2:DescribeTags"
    ]

    resources = ["*"]
  }
}

# 4) Create the managed policy
resource "aws_iam_policy" "github_actions_policy" {
  name        = local.policy_name
  description = "Minimal policy for GitHub Actions to push models to S3 and call SSM on EC2"
  policy      = data.aws_iam_policy_document.github_actions_policy_doc.json
}

# 5) Attach the policy to the user
resource "aws_iam_user_policy_attachment" "attach_policy" {
  user       = aws_iam_user.github_actions_user.name
  policy_arn = aws_iam_policy.github_actions_policy.arn
}

# 6) Create an access key for the user (no tags here)
resource "aws_iam_access_key" "github_actions_key" {
  user = aws_iam_user.github_actions_user.name
}

# 7) Sensitive outputs (capture immediately after apply)
output "github_actions_user_name" {
  value = aws_iam_user.github_actions_user.name
}


output "policy_arn" {
  value = aws_iam_policy.github_actions_policy.arn
}
