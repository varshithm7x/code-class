#!/bin/bash

# =============================================================================
# Automated Judge0 EC2 System - Quick Setup Script
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo "🚀 Automated Judge0 EC2 System - Quick Setup"
echo "=============================================="
echo

# =============================================================================
# Step 1: Check Prerequisites
# =============================================================================

print_info "Checking prerequisites..."

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    print_status "Node.js found: $NODE_VERSION"
else
    print_error "Node.js not found. Please install Node.js v18 or higher."
    exit 1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    print_status "npm found: $NPM_VERSION"
else
    print_error "npm not found. Please install npm."
    exit 1
fi

# Check Terraform
if command_exists terraform; then
    TERRAFORM_VERSION=$(terraform --version | head -n1)
    print_status "Terraform found: $TERRAFORM_VERSION"
else
    print_warning "Terraform not found. Installing via package manager..."
    if command_exists brew; then
        brew install terraform
    elif command_exists apt-get; then
        wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg
        echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
        sudo apt update && sudo apt install terraform
    else
        print_error "Please install Terraform manually from https://terraform.io"
        exit 1
    fi
fi

# Check AWS CLI
if command_exists aws; then
    AWS_VERSION=$(aws --version)
    print_status "AWS CLI found: $AWS_VERSION"
else
    print_warning "AWS CLI not found. Please install AWS CLI v2."
    print_info "Download from: https://aws.amazon.com/cli/"
fi

# Check Git
if command_exists git; then
    GIT_VERSION=$(git --version)
    print_status "Git found: $GIT_VERSION"
else
    print_error "Git not found. Please install Git."
    exit 1
fi

echo

# =============================================================================
# Step 2: Environment Setup
# =============================================================================

print_info "Setting up environment configuration..."

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -d "server" ]; then
    print_error "Please run this script from the project root directory."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f "server/.env" ]; then
    print_info "Creating environment configuration file..."
    
    read -p "Enter your AWS Access Key ID: " AWS_ACCESS_KEY_ID
    read -s -p "Enter your AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
    echo
    read -p "Enter your AWS Region (default: us-east-1): " AWS_REGION
    AWS_REGION=${AWS_REGION:-us-east-1}
    
    read -p "Enter your database URL: " DATABASE_URL
    read -p "Enter your JWT secret (or press enter for auto-generated): " JWT_SECRET
    
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET=$(openssl rand -base64 32)
        print_info "Generated JWT secret: $JWT_SECRET"
    fi
    
    cat > server/.env << EOF
# =================================
# DATABASE CONFIGURATION
# =================================
DATABASE_URL="$DATABASE_URL"
DIRECT_URL="$DATABASE_URL"

# =================================
# AWS CONFIGURATION (Judge0 Automation)
# =================================
AWS_REGION="$AWS_REGION"
AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"

# These will be populated after Terraform deployment
AWS_KEY_PAIR_NAME=""
AWS_SECURITY_GROUP_ID=""
AWS_IAM_INSTANCE_PROFILE=""

# =================================
# APPLICATION CONFIGURATION
# =================================
JWT_SECRET="$JWT_SECRET"
PORT=3001
NODE_ENV="development"

# =================================
# JUDGE0 CONFIGURATION
# =================================
JUDGE0_INSTANCE_TYPE="t3.medium"
JUDGE0_MAX_INSTANCES=5
JUDGE0_AUTO_SHUTDOWN_TIMEOUT=300

# =================================
# COST TRACKING
# =================================
ENABLE_COST_TRACKING="true"
COST_ALERT_THRESHOLD=10.00
EOF

    print_status "Environment file created at server/.env"
else
    print_status "Environment file already exists at server/.env"
fi

# =============================================================================
# Step 3: SSH Key Generation
# =============================================================================

print_info "Setting up SSH keys..."

SSH_KEY_PATH="$HOME/.ssh/judge0-key"

if [ ! -f "$SSH_KEY_PATH" ]; then
    print_info "Generating SSH key pair for Judge0 instances..."
    ssh-keygen -t rsa -b 4096 -f "$SSH_KEY_PATH" -N "" -C "judge0-automation"
    print_status "SSH key generated at $SSH_KEY_PATH"
else
    print_status "SSH key already exists at $SSH_KEY_PATH"
fi

# Display public key for Terraform configuration
print_info "Your public key for Terraform configuration:"
echo "========================================================"
cat "$SSH_KEY_PATH.pub"
echo "========================================================"

# =============================================================================
# Step 4: Terraform Configuration
# =============================================================================

print_info "Setting up Terraform configuration..."

if [ ! -f "infrastructure/terraform.tfvars" ]; then
    print_info "Creating Terraform variables file..."
    
    read -p "Enter your public IP address (for SSH access): " PUBLIC_IP
    
    PUBLIC_KEY_CONTENT=$(cat "$SSH_KEY_PATH.pub")
    
    cat > infrastructure/terraform.tfvars << EOF
# AWS Configuration
aws_region = "$AWS_REGION"

# SSH Configuration
ssh_public_key = "$PUBLIC_KEY_CONTENT"

# Security Configuration
admin_ip_ranges = [
  "$PUBLIC_IP/32"
]

# Environment Configuration
environment = "development"
project_name = "code-class"
EOF

    print_status "Terraform configuration created at infrastructure/terraform.tfvars"
else
    print_status "Terraform configuration already exists"
fi

# =============================================================================
# Step 5: Dependencies Installation
# =============================================================================

print_info "Installing dependencies..."

cd server
npm install
print_status "Server dependencies installed"

# Generate Prisma client
npx prisma generate
print_status "Prisma client generated"

cd ..

# =============================================================================
# Step 6: Infrastructure Deployment (Optional)
# =============================================================================

echo
print_info "Setup complete! Next steps:"
echo "1. Review your configuration files:"
echo "   - server/.env"
echo "   - infrastructure/terraform.tfvars"
echo
echo "2. Deploy AWS infrastructure:"
echo "   cd infrastructure"
echo "   terraform init"
echo "   terraform plan -var-file=\"terraform.tfvars\""
echo "   terraform apply -var-file=\"terraform.tfvars\""
echo
echo "3. Update environment variables with Terraform outputs"
echo
echo "4. Start the application:"
echo "   cd server"
echo "   npm run dev"
echo

read -p "Would you like to deploy the infrastructure now? (y/N): " DEPLOY_INFRA

if [ "$DEPLOY_INFRA" = "y" ] || [ "$DEPLOY_INFRA" = "Y" ]; then
    print_info "Deploying AWS infrastructure..."
    
    cd infrastructure
    
    # Initialize Terraform
    terraform init
    
    # Plan deployment
    print_info "Planning infrastructure deployment..."
    terraform plan -var-file="terraform.tfvars"
    
    echo
    read -p "Do you want to apply this plan? (y/N): " APPLY_PLAN
    
    if [ "$APPLY_PLAN" = "y" ] || [ "$APPLY_PLAN" = "Y" ]; then
        terraform apply -var-file="terraform.tfvars"
        
        if [ $? -eq 0 ]; then
            print_status "Infrastructure deployed successfully!"
            
            # Get outputs and update .env
            print_info "Updating environment variables with Terraform outputs..."
            
            KEY_PAIR_NAME=$(terraform output -raw key_pair_name 2>/dev/null || echo "")
            SECURITY_GROUP_ID=$(terraform output -raw security_group_id 2>/dev/null || echo "")
            IAM_INSTANCE_PROFILE=$(terraform output -raw iam_instance_profile 2>/dev/null || echo "")
            
            if [ ! -z "$KEY_PAIR_NAME" ]; then
                sed -i.bak "s/AWS_KEY_PAIR_NAME=\"\"/AWS_KEY_PAIR_NAME=\"$KEY_PAIR_NAME\"/" ../server/.env
            fi
            
            if [ ! -z "$SECURITY_GROUP_ID" ]; then
                sed -i.bak "s/AWS_SECURITY_GROUP_ID=\"\"/AWS_SECURITY_GROUP_ID=\"$SECURITY_GROUP_ID\"/" ../server/.env
            fi
            
            if [ ! -z "$IAM_INSTANCE_PROFILE" ]; then
                sed -i.bak "s/AWS_IAM_INSTANCE_PROFILE=\"\"/AWS_IAM_INSTANCE_PROFILE=\"$IAM_INSTANCE_PROFILE\"/" ../server/.env
            fi
            
            print_status "Environment variables updated!"
            
            echo
            print_status "🎉 Complete setup finished successfully!"
            print_info "You can now start the application with: cd server && npm run dev"
            
        else
            print_error "Infrastructure deployment failed. Please check the errors above."
        fi
    else
        print_info "Infrastructure deployment skipped. You can deploy later with:"
        print_info "cd infrastructure && terraform apply -var-file=\"terraform.tfvars\""
    fi
    
    cd ..
else
    print_info "Infrastructure deployment skipped."
fi

echo
print_status "Setup script completed!"
print_info "For detailed instructions, see: END_TO_END_SETUP_GUIDE.md"