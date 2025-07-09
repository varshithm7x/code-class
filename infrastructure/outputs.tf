output "vpc_id" {
  description = "ID of the Judge0 VPC"
  value       = aws_vpc.judge0_vpc.id
}

output "subnet_id" {
  description = "ID of the public subnet"
  value       = aws_subnet.judge0_public.id
}

output "security_group_id" {
  description = "ID of the Judge0 security group"
  value       = aws_security_group.judge0_sg.id
}

output "iam_instance_profile_name" {
  description = "Name of the IAM instance profile"
  value       = aws_iam_instance_profile.judge0_profile.name
}

output "key_pair_name" {
  description = "Name of the SSH key pair"
  value       = aws_key_pair.judge0_key.key_name
}

output "lambda_test_scheduler_arn" {
  description = "ARN of the test scheduler Lambda function"
  value       = aws_lambda_function.test_scheduler.arn
}

output "lambda_health_monitor_arn" {
  description = "ARN of the health monitor Lambda function"
  value       = aws_lambda_function.health_monitor.arn
}

output "lambda_auto_shutdown_arn" {
  description = "ARN of the auto shutdown Lambda function"
  value       = aws_lambda_function.auto_shutdown.arn
} 