terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

# VPC for Judge0 instances
resource "aws_vpc" "judge0_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name    = "judge0-vpc"
    Project = "code-class"
  }
}

# Public subnet
resource "aws_subnet" "judge0_public" {
  vpc_id                  = aws_vpc.judge0_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = {
    Name    = "judge0-public-subnet"
    Project = "code-class"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "judge0_igw" {
  vpc_id = aws_vpc.judge0_vpc.id

  tags = {
    Name    = "judge0-igw"
    Project = "code-class"
  }
}

# Route table
resource "aws_route_table" "judge0_public" {
  vpc_id = aws_vpc.judge0_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.judge0_igw.id
  }

  tags = {
    Name    = "judge0-public-rt"
    Project = "code-class"
  }
}

# Route table association
resource "aws_route_table_association" "judge0_public" {
  subnet_id      = aws_subnet.judge0_public.id
  route_table_id = aws_route_table.judge0_public.id
}

# Security Group for Judge0 instances
resource "aws_security_group" "judge0_sg" {
  name        = "judge0-security-group"
  description = "Security group for Judge0 instances"
  vpc_id      = aws_vpc.judge0_vpc.id

  # Judge0 API port
  ingress {
    from_port   = 2358
    to_port     = 2358
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # SSH access (restricted to admin IPs)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.admin_ip_ranges
  }

  # Health check port
  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # All outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "judge0-security-group"
    Project = "code-class"
  }
}

# IAM role for Judge0 instances
resource "aws_iam_role" "judge0_instance_role" {
  name = "judge0-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name    = "judge0-instance-role"
    Project = "code-class"
  }
}

# IAM policy for Judge0 instances
resource "aws_iam_role_policy" "judge0_instance_policy" {
  name = "judge0-instance-policy"
  role = aws_iam_role.judge0_instance_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:PutParameter",
          "cloudwatch:PutMetricData",
          "ec2:DescribeInstances",
          "ec2:TerminateInstances"
        ]
        Resource = "*"
      }
    ]
  })
}

# IAM instance profile
resource "aws_iam_instance_profile" "judge0_profile" {
  name = "judge0-instance-profile"
  role = aws_iam_role.judge0_instance_role.name
}

# Key pair for SSH access
resource "aws_key_pair" "judge0_key" {
  key_name   = "judge0-key"
  public_key = var.ssh_public_key

  tags = {
    Name    = "judge0-key"
    Project = "code-class"
  }
}





 