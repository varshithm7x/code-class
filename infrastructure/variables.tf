variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "ssh_public_key" {
  description = "SSH public key for EC2 instance access"
  type        = string
}

variable "admin_ip_ranges" {
  description = "IP ranges allowed for SSH access to EC2 instances"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Replace with actual admin IPs in production
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name for resource tagging"
  type        = string
  default     = "code-class"
} 