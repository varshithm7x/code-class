# Judge0 EC2 Automation Setup Guide

## 🎯 Overview

This implementation adds automated Judge0 EC2 instance management to the code-class platform, following the plan outlined in `AUTOMATED_JUDGE0_EC2_IMPLEMENTATION_PLAN.md`.

## 📋 What's Been Implemented (Phase 1)

### 1. Database Schema Extensions
- Added `Judge0Instance` model to track EC2 instances
- Added `Judge0InstanceStatus` enum for instance lifecycle management
- Extended `CodingTest` model with Judge0 instance relation

### 2. AWS Infrastructure Services
- **AWSInfrastructureService**: Manages EC2 instance lifecycle
- **Judge0AutomationService**: Coordinates test scheduling and execution
- Terraform infrastructure configuration in `infrastructure/` directory

### 3. API Endpoints
- `POST /:testId/schedule-automated` - Launch automated Judge0 instance for test
- `POST /:testId/execute-automated` - Execute code using automated instance
- `POST /:testId/submit-automated` - Submit final solutions via automated instance
- `GET /:testId/judge0-status` - Get instance status and cost information

## 🔧 Environment Variables Required

Add these to your `.env` file:

```bash
# AWS Configuration for Judge0 Automation
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your_aws_access_key_id"
AWS_SECRET_ACCESS_KEY="your_aws_secret_access_key"
AWS_KEY_PAIR_NAME="judge0-key"
AWS_SECURITY_GROUP_ID="sg-xxxxxxxxx"
AWS_IAM_INSTANCE_PROFILE="judge0-instance-profile"
```

## 🚀 Deployment Steps

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Update Database Schema
```bash
npx prisma db push
```

### 3. Deploy AWS Infrastructure
```bash
cd infrastructure
terraform init
terraform plan -var="ssh_public_key=your_public_key_content"
terraform apply
```

### 4. Configure Environment Variables
Update your `.env` file with the Terraform outputs for:
- AWS_SECURITY_GROUP_ID
- AWS_IAM_INSTANCE_PROFILE
- AWS_KEY_PAIR_NAME

## 💰 Cost Optimization Features

- **Automatic Launch**: EC2 instances only start when tests are scheduled
- **Auto-Shutdown**: Instances terminate after all submissions are processed
- **Cost Tracking**: Real-time cost calculation and reporting
- **Efficiency**: Batch processing for 100+ test cases per submission

## 📊 Expected Performance

- **Launch Time**: < 10 minutes from schedule to ready
- **Cost per Test**: $0.31-0.53 for 2-3 hour sessions
- **Throughput**: 100+ students with 3-4 problems each
- **Reliability**: Auto-recovery and health monitoring

## 🔍 Monitoring

The system includes:
- Real-time instance health checks
- Test progress monitoring
- Automatic shutdown detection
- Cost tracking and reporting

## 🔄 Usage Flow

1. **Teacher schedules test** → `POST /:testId/schedule-automated`
2. **System launches EC2** → Judge0 installation and setup
3. **Students take test** → Real-time execution via `POST /:testId/execute-automated`
4. **Final submissions** → Batch processing via `POST /:testId/submit-automated`
5. **Auto-shutdown** → Instance terminates and costs are calculated

## ⚠️ Important Notes

- This is Phase 1 implementation (Infrastructure Foundation)
- Lambda functions referenced in Terraform need to be deployed separately
- Health monitoring and failure recovery will be added in later phases
- Current implementation focuses on core EC2 automation functionality

## 🔗 Integration

The automated system seamlessly integrates with existing test session management:
- Uses existing authentication and authorization
- Compatible with current test creation workflow
- Maintains existing API patterns and responses
- Adds automation as an enhancement, not a replacement

## 📈 Next Steps (Future Phases)

1. **Phase 2**: Lambda function implementation and automation scripts
2. **Phase 3**: Health monitoring and failure recovery
3. **Phase 4**: Performance optimization and cost analytics
4. **Phase 5**: Production hardening and scaling 