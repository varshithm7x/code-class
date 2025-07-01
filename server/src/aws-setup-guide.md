# AWS Setup Guide for Judge0 EC2 Automation

## Required AWS Credentials

Set these environment variables before testing:

```bash
export AWS_ACCESS_KEY_ID="your_access_key_here"
export AWS_SECRET_ACCESS_KEY="your_secret_key_here"
export AWS_REGION="ap-south-1"  # Or your preferred region
```

## Required IAM Permissions

Your AWS user/role needs these permissions:

### EC2 Permissions
```json
{
  "Effect": "Allow",
  "Action": [
    "ec2:DescribeInstances",
    "ec2:RunInstances", 
    "ec2:TerminateInstances",
    "ec2:DescribeImages",
    "ec2:DescribeVpcs",
    "ec2:DescribeSubnets",
    "ec2:DescribeSecurityGroups",
    "ec2:CreateSecurityGroup",
    "ec2:DeleteSecurityGroup",
    "ec2:AuthorizeSecurityGroupIngress"
  ],
  "Resource": "*"
}
```

### SSM Permissions  
```json
{
  "Effect": "Allow",
  "Action": [
    "ssm:GetParameter",
    "ssm:PutParameter", 
    "ssm:DeleteParameter"
  ],
  "Resource": "arn:aws:ssm:*:*:parameter/judge0/*"
}
```

## Testing Sequence

### 1. Core Logic Test (Free)
```bash
npm run test:light
```
✅ Tests mathematical calculations and algorithms

### 2. AWS Connectivity Test (Free)
```bash
npm run test:aws
```
✅ Verifies AWS credentials and permissions  

### 3. EC2 Launch Test (Paid)
```bash
npm run test:ec2
```
⚠️ **Creates real EC2 instance - charges apply!**
💰 Cost: ~$0.02 for t3.small (~10 minutes)

## Cost Breakdown

| Test Type | Cost | Duration | Resources |
|-----------|------|----------|-----------|
| Core Logic | Free | 5ms | CPU only |
| AWS Connectivity | Free | 30s | API calls only |
| EC2 Launch | ~$0.02 | 10min | t3.small instance |

## Next Steps

1. ✅ Run `npm run test:light` (verify core logic)
2. 🔧 Run `npm run test:aws` (verify credentials)  
3. 🚀 Run `npm run test:ec2` (test real EC2 creation)
4. 🏥 Proceed to full integration testing 