# AWS Setup Guide for Judge0 Infrastructure

## Step 1: Create IAM User in AWS Console

1. **Log into AWS Console**: Go to https://console.aws.amazon.com/
2. **Navigate to IAM**: Search for "IAM" in the services
3. **Create User**:
   - Click "Users" → "Create user"
   - Username: `terraform-judge0-user`
   - Select "Provide user access to the AWS Management Console" (optional)
   - Click "Next"

## Step 2: Attach Required Policies

Attach these AWS managed policies to your user:

**Required Policies:**
- `AmazonEC2FullAccess`
- `AmazonVPCFullAccess`
- `IAMFullAccess`
- `AWSLambdaFullAccess`
- `CloudWatchFullAccess`
- `AmazonEventBridgeFullAccess`
- `AmazonSSMFullAccess`
- `AmazonS3FullAccess`

**To attach policies:**
1. Select your user → "Permissions" tab
2. Click "Add permissions" → "Attach policies directly"
3. Search and select each policy above
4. Click "Next" → "Add permissions"

## Step 3: Create Access Keys

1. Go to your user → "Security credentials" tab
2. Scroll to "Access keys" section
3. Click "Create access key"
4. Select "Command Line Interface (CLI)"
5. Check the confirmation box
6. Click "Create access key"
7. **IMPORTANT**: Copy both:
   - Access Key ID
   - Secret Access Key
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure credentials
aws configure
## Step 4: Configure AWS Credentials

Choose one of these methods:

### Method A: AWS CLI (Recommended)

```bash
# Install AWS CLI if not already installed
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure credentials
aws configure
```

When prompted, enter:
- AWS Access Key ID: [Your Access Key ID]
- AWS Secret Access Key: [Your Secret Access Key]
- Default region name: `ap-south-1`
- Default output format: `json`

### Method B: Environment Variables

```bash
export AWS_ACCESS_KEY_ID="your-access-key-id"
export AWS_SECRET_ACCESS_KEY="your-secret-access-key"
export AWS_DEFAULT_REGION="ap-south-1"
```

### Method C: Credentials File

Create `~/.aws/credentials`:
```ini
[default]
aws_access_key_id = your-access-key-id
aws_secret_access_key = your-secret-access-key
```

Create `~/.aws/config`:
```ini
[default]
region = ap-south-1
output = json
```

## Step 5: Verify Setup

```bash
# Test AWS credentials
aws sts get-caller-identity

# Should return your user ARN and account info
```

## Step 6: Run Terraform

```bash
cd infrastructure
terraform init
terraform plan -var-file="terraform.tfvars"
```

## Security Notes

- **Never commit AWS credentials to git**
- Store credentials securely
- Consider using AWS IAM roles for production
- Regularly rotate access keys
- Follow principle of least privilege

## Troubleshooting

If you get permission errors, ensure your IAM user has all the required policies listed above. 