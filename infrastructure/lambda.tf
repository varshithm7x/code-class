# Lambda Functions for Phase 3 - Integration Layer
# Provides serverless orchestration as an alternative to direct EC2 management

# IAM Role for Lambda Functions
resource "aws_iam_role" "judge0_lambda_role" {
  name = "Judge0LambdaExecutionRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# IAM Policy for Lambda Functions
resource "aws_iam_role_policy" "judge0_lambda_policy" {
  name = "Judge0LambdaPolicy"
  role = aws_iam_role.judge0_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:RunInstances",
          "ec2:TerminateInstances",
          "ec2:DescribeInstances",
          "ec2:DescribeInstanceStatus",
          "ec2:CreateTags"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:PutParameter",
          "ssm:DeleteParameter",
          "ssm:GetParameters"
        ]
        Resource = "arn:aws:ssm:*:*:parameter/judge0/*"
      },
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = "arn:aws:lambda:*:*:function:judge0-*"
      },
      {
        Effect = "Allow"
        Action = [
          "iam:PassRole"
        ]
        Resource = aws_iam_role.judge0_instance_role.arn
      }
    ]
  })
}

# Package Lambda Functions
data "archive_file" "test_scheduler_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda/test-scheduler-launcher.js"
  output_path = "${path.module}/lambda/test-scheduler-launcher.zip"
}

data "archive_file" "health_monitor_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda/health-monitor.js"
  output_path = "${path.module}/lambda/health-monitor.zip"
}

data "archive_file" "auto_shutdown_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda/auto-shutdown.js"
  output_path = "${path.module}/lambda/auto-shutdown.zip"
}

# Test Scheduler Lambda Function
resource "aws_lambda_function" "test_scheduler" {
  filename         = data.archive_file.test_scheduler_zip.output_path
  function_name    = "judge0-test-scheduler-launcher"
  role            = aws_iam_role.judge0_lambda_role.arn
  handler         = "test-scheduler-launcher.handler"
  runtime         = "nodejs18.x"
  timeout         = 300
  memory_size     = 512

  source_code_hash = data.archive_file.test_scheduler_zip.output_base64sha256

  environment {
    variables = {
      SUBNET_ID = aws_subnet.judge0_public.id
      SECURITY_GROUP_ID = aws_security_group.judge0_sg.id
      IAM_INSTANCE_PROFILE = aws_iam_instance_profile.judge0_profile.name
      HEALTH_MONITOR_LAMBDA = aws_lambda_function.health_monitor.function_name
      AUTO_SHUTDOWN_LAMBDA = aws_lambda_function.auto_shutdown.function_name
    }
  }

  tags = {
    Name = "Judge0-TestScheduler"
    Purpose = "Phase3-Integration"
  }
}

# Health Monitor Lambda Function
resource "aws_lambda_function" "health_monitor" {
  filename         = data.archive_file.health_monitor_zip.output_path
  function_name    = "judge0-health-monitor"
  role            = aws_iam_role.judge0_lambda_role.arn
  handler         = "health-monitor.handler"
  runtime         = "nodejs18.x"
  timeout         = 60
  memory_size     = 256

  source_code_hash = data.archive_file.health_monitor_zip.output_base64sha256

  tags = {
    Name = "Judge0-HealthMonitor"
    Purpose = "Phase3-Integration"
  }
}

# Auto Shutdown Lambda Function
resource "aws_lambda_function" "auto_shutdown" {
  filename         = data.archive_file.auto_shutdown_zip.output_path
  function_name    = "judge0-auto-shutdown"
  role            = aws_iam_role.judge0_lambda_role.arn
  handler         = "auto-shutdown.handler"
  runtime         = "nodejs18.x"
  timeout         = 60
  memory_size     = 256

  source_code_hash = data.archive_file.auto_shutdown_zip.output_base64sha256

  tags = {
    Name = "Judge0-AutoShutdown"
    Purpose = "Phase3-Integration"
  }
}

# CloudWatch Log Groups for Lambda Functions
resource "aws_cloudwatch_log_group" "test_scheduler_logs" {
  name              = "/aws/lambda/${aws_lambda_function.test_scheduler.function_name}"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "health_monitor_logs" {
  name              = "/aws/lambda/${aws_lambda_function.health_monitor.function_name}"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "auto_shutdown_logs" {
  name              = "/aws/lambda/${aws_lambda_function.auto_shutdown.function_name}"
  retention_in_days = 7
}

# EventBridge Rules for Scheduled Health Checks (Optional)
resource "aws_cloudwatch_event_rule" "health_check_schedule" {
  name                = "judge0-health-check-schedule"
  description         = "Trigger health check every 2 minutes for active tests"
  schedule_expression = "rate(2 minutes)"
  state              = "DISABLED" # Enable when needed
}

resource "aws_cloudwatch_event_target" "health_check_target" {
  rule      = aws_cloudwatch_event_rule.health_check_schedule.name
  target_id = "Judge0HealthCheckTarget"
  arn       = aws_lambda_function.health_monitor.arn
}

resource "aws_lambda_permission" "allow_eventbridge_health_check" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.health_monitor.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.health_check_schedule.arn
}

# SSM Parameters for Lambda Configuration
resource "aws_ssm_parameter" "lambda_config" {
  name  = "/judge0/lambda/config"
  type  = "String"
  value = jsonencode({
    test_scheduler_function = aws_lambda_function.test_scheduler.function_name
    health_monitor_function = aws_lambda_function.health_monitor.function_name
    auto_shutdown_function = aws_lambda_function.auto_shutdown.function_name
    default_instance_type = "t3.medium"
    default_region = var.aws_region
  })

  tags = {
    Name = "Judge0-Lambda-Config"
    Purpose = "Phase3-Integration"
  }
} 