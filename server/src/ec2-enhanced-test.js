#!/usr/bin/env node

/**
 * Enhanced EC2 Judge0 Test with Comprehensive Diagnostics
 * Provides detailed logging and remote debugging capabilities
 */

require('dotenv').config();
const AWS = require('aws-sdk');
const { promisify } = require('util');

// Configure AWS
AWS.config.update({ region: 'ap-south-1' });
const ec2 = new AWS.EC2();
const ssm = new AWS.SSM();

const TEST_CONFIG = {
  testId: `enhanced-test-${Date.now()}`,
  instanceType: 't3.small',
  maxWaitMinutes: 15, // Extended time
  region: AWS.config.region,
  keyPairName: 'judge0-debug-key', // We'll create this
  logGroup: '/aws/ec2/judge0-test'
};

// Enhanced user data script with comprehensive logging
function getEnhancedUserDataScript(testId) {
  return Buffer.from(`#!/bin/bash
set -x  # Enable debug mode
exec > >(tee /var/log/user-data.log) 2>&1  # Log everything

echo "🚀 Starting Enhanced Judge0 Setup - $(date)"
echo "Test ID: ${testId}"
echo "Instance ID: $(curl -s http://169.254.169.254/latest/meta-data/instance-id)"
echo "Public IP: $(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"

# Function to log status to SSM
log_status() {
  local status="$1"
  local message="$2"
  echo "STATUS: $status - $message"
  aws ssm put-parameter --name "/judge0/${testId}/status" --value "$status" --overwrite --region ${AWS.config.region} || echo "Failed to update SSM"
  aws ssm put-parameter --name "/judge0/${testId}/log" --value "$message" --overwrite --region ${AWS.config.region} || echo "Failed to update log"
}

# Function to check command success
check_cmd() {
  local cmd="$1"
  local desc="$2"
  echo "Executing: $desc"
  if eval "$cmd"; then
    log_status "PROGRESS" "$desc: SUCCESS"
    return 0
  else
    log_status "FAILED" "$desc: FAILED"
    exit 1
  fi
}

log_status "STARTED" "User data script started"

# System information
echo "=== SYSTEM INFO ==="
uname -a
df -h
free -m
cat /etc/os-release

# Update system
log_status "UPDATING" "Updating system packages"
check_cmd "apt-get update -y" "System update"

# Install required packages
log_status "INSTALLING" "Installing required packages"
check_cmd "apt-get install -y docker.io docker-compose curl jq unzip wget htop python3-pip" "Package installation"

# Install AWS CLI v2
log_status "AWS_CLI" "Installing AWS CLI v2"
check_cmd "curl 'https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip' -o 'awscliv2.zip'" "AWS CLI download"
check_cmd "unzip -q awscliv2.zip" "AWS CLI extraction"
check_cmd "./aws/install" "AWS CLI installation"
check_cmd "rm -rf aws awscliv2.zip" "AWS CLI cleanup"

# Configure Docker
log_status "DOCKER_SETUP" "Setting up Docker"
check_cmd "systemctl start docker" "Docker start"
check_cmd "systemctl enable docker" "Docker enable"
check_cmd "usermod -a -G docker ubuntu" "Docker permissions"

# Verify Docker
check_cmd "docker --version" "Docker version check"
check_cmd "docker-compose --version" "Docker Compose version check"
check_cmd "docker ps" "Docker daemon test"

# Download Judge0
log_status "DOWNLOADING" "Downloading Judge0"
check_cmd "cd /opt" "Change to /opt"
check_cmd "wget -q https://github.com/judge0/judge0/releases/download/v1.13.0/judge0-v1.13.0.zip" "Judge0 download"
check_cmd "unzip -q judge0-v1.13.0.zip" "Judge0 extraction"
check_cmd "cd judge0-v1.13.0" "Enter Judge0 directory"

# Show Judge0 files
echo "=== JUDGE0 FILES ==="
ls -la /opt/judge0-v1.13.0/

# Start services step by step
log_status "STARTING_DB" "Starting database and Redis"
echo "Starting database and Redis..."
docker-compose up -d db redis
if [ $? -eq 0 ]; then
  log_status "DB_STARTED" "Database and Redis started successfully"
else
  log_status "DB_FAILED" "Failed to start database and Redis"
  docker-compose logs db
  docker-compose logs redis
  exit 1
fi

# Wait and check DB
echo "Waiting for database to be ready..."
sleep 30

echo "=== CONTAINER STATUS ==="
docker ps -a
docker-compose logs --tail=50

# Start Judge0 API
log_status "STARTING_API" "Starting Judge0 API services"
echo "Starting Judge0 API services..."
docker-compose up -d
if [ $? -eq 0 ]; then
  log_status "API_STARTING" "Judge0 API services started, waiting for readiness"
else
  log_status "API_FAILED" "Failed to start Judge0 API services"
  docker-compose logs
  exit 1
fi

# Wait for API to be ready
echo "Waiting for Judge0 API to be ready..."
for i in {1..60}; do
  echo "Health check attempt $i/60..."
  
  # Check if containers are running
  running_containers=$(docker ps --format "table {{.Names}}" | grep -v NAMES | wc -l)
  echo "Running containers: $running_containers"
  
  # Try to access languages endpoint
  if curl -f -s http://localhost:2358/languages >/dev/null 2>&1; then
    echo "✅ Judge0 API is responding!"
    
    # Get language count
    lang_count=$(curl -s http://localhost:2358/languages | jq length)
    echo "Available languages: $lang_count"
    
    # Test a simple submission
    echo "Testing code submission..."
    submit_response=$(curl -s -X POST http://localhost:2358/submissions \
      -H "Content-Type: application/json" \
      -d '{"source_code":"I2luY2x1ZGUgPGlvc3RyZWFtPgp1c2luZyBuYW1lc3BhY2Ugc3RkOwppbnQgbWFpbigpIHsgY291dCA8PCAiSGVsbG8gV29ybGQiOyByZXR1cm4gMDsgfQ==","language_id":54}')
    
    token=$(echo "$submit_response" | jq -r '.token')
    if [ "$token" != "null" ]; then
      echo "Submission token: $token"
      log_status "READY" "Judge0 setup completed successfully - Languages: $lang_count, Test submission: $token"
      
      # Save final diagnostics
      echo "=== FINAL DIAGNOSTICS ===" > /var/log/final-diagnostics.log
      docker ps -a >> /var/log/final-diagnostics.log
      docker-compose logs >> /var/log/final-diagnostics.log
      curl -s http://localhost:2358/languages | head -20 >> /var/log/final-diagnostics.log
      
      exit 0
    else
      echo "Failed to submit test code"
    fi
  fi
  
  # Show container logs every 10 attempts
  if [ $((i % 10)) -eq 0 ]; then
    echo "=== CONTAINER LOGS (attempt $i) ==="
    docker-compose logs --tail=20
  fi
  
  sleep 10
done

log_status "TIMEOUT" "Judge0 API failed to become ready within timeout"

# Final diagnostics
echo "=== FINAL ERROR DIAGNOSTICS ==="
docker ps -a
docker-compose logs
systemctl status docker
netstat -tlnp | grep :2358
df -h
free -m

exit 1
`).toString('base64');
}

async function createKeyPair() {
  console.log('🔑 Creating SSH key pair for debugging...');
  
  try {
    // Check if key pair already exists
    try {
      await ec2.describeKeyPairs({ KeyNames: [TEST_CONFIG.keyPairName] }).promise();
      console.log(`   Key pair ${TEST_CONFIG.keyPairName} already exists`);
      return TEST_CONFIG.keyPairName;
    } catch (error) {
      if (error.code !== 'InvalidKeyPair.NotFound') {
        throw error;
      }
    }
    
    // Create new key pair
    const keyPair = await ec2.createKeyPair({
      KeyName: TEST_CONFIG.keyPairName
    }).promise();
    
    // Save private key locally for debugging
    const fs = require('fs').promises;
    await fs.writeFile(`/tmp/${TEST_CONFIG.keyPairName}.pem`, keyPair.KeyMaterial);
    await require('child_process').execSync(`chmod 600 /tmp/${TEST_CONFIG.keyPairName}.pem`);
    
    console.log(`   Created key pair: ${TEST_CONFIG.keyPairName}`);
    console.log(`   Private key saved: /tmp/${TEST_CONFIG.keyPairName}.pem`);
    
    return TEST_CONFIG.keyPairName;
  } catch (error) {
    console.log(`   ❌ Key pair creation failed: ${error.message}`);
    throw error;
  }
}

async function getDefaultVPCInfo() {
  console.log('🔍 Finding default VPC and subnet...');
  
  try {
    const vpcs = await ec2.describeVpcs({
      Filters: [{ Name: 'isDefault', Values: ['true'] }]
    }).promise();
    
    if (vpcs.Vpcs.length === 0) {
      throw new Error('No default VPC found');
    }
    
    const vpcId = vpcs.Vpcs[0].VpcId;
    console.log(`   Default VPC: ${vpcId}`);
    
    const subnets = await ec2.describeSubnets({
      Filters: [
        { Name: 'vpc-id', Values: [vpcId] },
        { Name: 'default-for-az', Values: ['true'] }
      ]
    }).promise();
    
    if (subnets.Subnets.length === 0) {
      throw new Error('No default subnet found');
    }
    
    const subnetId = subnets.Subnets[0].SubnetId;
    console.log(`   Default subnet: ${subnetId}`);
    
    return { vpcId, subnetId };
  } catch (error) {
    console.log(`   ❌ VPC discovery failed: ${error.message}`);
    throw error;
  }
}

async function createSecurityGroup(vpcId) {
  console.log('🛡️ Creating security group...');
  
  try {
    const sgName = `judge0-enhanced-test-${TEST_CONFIG.testId}`;
    
    const sg = await ec2.createSecurityGroup({
      GroupName: sgName,
      Description: 'Judge0 enhanced test security group with SSH access',
      VpcId: vpcId
    }).promise();
    
    const sgId = sg.GroupId;
    console.log(`   Created security group: ${sgId}`);
    
    // Add comprehensive access rules
    await ec2.authorizeSecurityGroupIngress({
      GroupId: sgId,
      IpPermissions: [
        {
          IpProtocol: 'tcp',
          FromPort: 22,
          ToPort: 22,
          IpRanges: [{ CidrIp: '0.0.0.0/0' }]
        },
        {
          IpProtocol: 'tcp',
          FromPort: 2358,
          ToPort: 2358,
          IpRanges: [{ CidrIp: '0.0.0.0/0' }]
        },
        {
          IpProtocol: 'tcp',
          FromPort: 80,
          ToPort: 80,
          IpRanges: [{ CidrIp: '0.0.0.0/0' }]
        }
      ]
    }).promise();
    
    console.log('   Added SSH, Judge0 API, and HTTP access rules');
    return sgId;
  } catch (error) {
    console.log(`   ❌ Security group creation failed: ${error.message}`);
    throw error;
  }
}

async function launchEnhancedInstance(subnetId, sgId, keyName) {
  console.log('🚀 Launching enhanced EC2 instance...');
  
  try {
    const amiId = 'ami-0f918f7e67a3323f0'; // Ubuntu 24.04 LTS
    
    const params = {
      ImageId: amiId,
      InstanceType: TEST_CONFIG.instanceType,
      MinCount: 1,
      MaxCount: 1,
      SubnetId: subnetId,
      SecurityGroupIds: [sgId],
      KeyName: keyName,
      UserData: getEnhancedUserDataScript(TEST_CONFIG.testId),
      BlockDeviceMappings: [
        {
          DeviceName: '/dev/sda1',
          Ebs: {
            VolumeSize: 20, // 20GB instead of default ~7GB
            VolumeType: 'gp3',
            DeleteOnTermination: true
          }
        }
      ],
      TagSpecifications: [
        {
          ResourceType: 'instance',
          Tags: [
            { Key: 'Name', Value: `Judge0-Enhanced-Test-${TEST_CONFIG.testId}` },
            { Key: 'TestId', Value: TEST_CONFIG.testId },
            { Key: 'Purpose', Value: 'Judge0-Enhanced-Testing' },
            { Key: 'SSH-Key', Value: TEST_CONFIG.keyPairName }
          ]
        }
      ]
    };
    
    const result = await ec2.runInstances(params).promise();
    const instanceId = result.Instances[0].InstanceId;
    
    console.log(`   Instance launched: ${instanceId}`);
    console.log(`   SSH key: ${TEST_CONFIG.keyPairName}`);
    return instanceId;
  } catch (error) {
    console.log(`   ❌ Instance launch failed: ${error.message}`);
    throw error;
  }
}

async function waitForInstanceReady(instanceId) {
  console.log('⏳ Waiting for instance to be running...');
  
  try {
    await ec2.waitFor('instanceRunning', {
      InstanceIds: [instanceId]
    }).promise();
    
    const instances = await ec2.describeInstances({
      InstanceIds: [instanceId]
    }).promise();
    
    const instance = instances.Reservations[0].Instances[0];
    const publicIp = instance.PublicIpAddress;
    
    console.log(`   Instance running: ${instanceId}`);
    console.log(`   Public IP: ${publicIp}`);
    console.log(`   SSH command: ssh -i /tmp/${TEST_CONFIG.keyPairName}.pem ubuntu@${publicIp}`);
    
    return publicIp;
  } catch (error) {
    console.log(`   ❌ Instance failed to start: ${error.message}`);
    throw error;
  }
}

async function monitorEnhancedSetup(testId, maxMinutes = 15) {
  console.log('📊 Monitoring enhanced Judge0 setup...');
  console.log('   Checking both status and detailed logs...\n');
  
  const maxAttempts = maxMinutes * 2; // Check every 30 seconds
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Get status
      let status = 'UNKNOWN';
      try {
        const statusParam = await ssm.getParameter({
          Name: `/judge0/${testId}/status`
        }).promise();
        status = statusParam.Parameter.Value;
      } catch (error) {
        if (error.code !== 'ParameterNotFound') {
          console.log(`   ⚠️ Status check error: ${error.message}`);
        }
      }
      
      // Get detailed log
      let logMessage = 'No log available';
      try {
        const logParam = await ssm.getParameter({
          Name: `/judge0/${testId}/log`
        }).promise();
        logMessage = logParam.Parameter.Value;
      } catch (error) {
        // Log parameter may not exist yet
      }
      
      console.log(`   [${attempt}/${maxAttempts}] Status: ${status}`);
      console.log(`   └─ ${logMessage}`);
      
      if (status === 'READY') {
        console.log('\n   ✅ Judge0 setup completed successfully!');
        return { success: true, status, log: logMessage };
      } else if (status.includes('FAILED') || status.includes('ERROR') || status === 'TIMEOUT') {
        console.log(`\n   ❌ Setup failed with status: ${status}`);
        return { success: false, status, log: logMessage };
      }
    } catch (error) {
      console.log(`   ⚠️ Monitoring error: ${error.message}`);
    }
    
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }
  
  console.log('\n   ⏰ Setup timeout - Judge0 did not complete in time');
  return { success: false, status: 'MONITORING_TIMEOUT', log: 'Setup monitoring timed out' };
}

async function cleanupResources(instanceId, sgId, keyName) {
  console.log('🧹 Cleaning up resources...');
  
  try {
    // Terminate instance
    if (instanceId) {
      await ec2.terminateInstances({ InstanceIds: [instanceId] }).promise();
      console.log(`   Terminated instance: ${instanceId}`);
      
      await ec2.waitFor('instanceTerminated', {
        InstanceIds: [instanceId]
      }).promise();
      console.log('   Instance terminated');
    }
    
    // Delete security group
    if (sgId) {
      await ec2.deleteSecurityGroup({ GroupId: sgId }).promise();
      console.log(`   Deleted security group: ${sgId}`);
    }
    
    // Cleanup SSM parameters
    try {
      await ssm.deleteParameter({ Name: `/judge0/${TEST_CONFIG.testId}/status` }).promise();
      await ssm.deleteParameter({ Name: `/judge0/${TEST_CONFIG.testId}/log` }).promise();
      console.log('   Cleaned up SSM parameters');
    } catch (error) {
      // Ignore if parameters don't exist
    }
    
    // Note: Keep key pair for manual debugging if needed
    console.log(`   ℹ️  SSH key preserved for debugging: /tmp/${keyName}.pem`);
    
  } catch (error) {
    console.log(`   ⚠️ Cleanup warning: ${error.message}`);
  }
}

async function runEnhancedEC2Test() {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();
  
  console.log('🔬 Enhanced EC2 Judge0 Test with Full Diagnostics');
  console.log(`📊 Initial memory: ${(startMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log(`🎯 Test ID: ${TEST_CONFIG.testId}`);
  console.log(`🌍 Region: ${TEST_CONFIG.region}\n`);
  
  let instanceId = null;
  let sgId = null;
  let keyName = null;
  let publicIp = null;
  let result = { success: false, status: 'NOT_STARTED', log: '' };
  
  try {
    // Setup infrastructure
    keyName = await createKeyPair();
    const { vpcId, subnetId } = await getDefaultVPCInfo();
    sgId = await createSecurityGroup(vpcId);
    
    // Launch instance
    instanceId = await launchEnhancedInstance(subnetId, sgId, keyName);
    publicIp = await waitForInstanceReady(instanceId);
    
    // Monitor setup with detailed logging
    console.log('');
    result = await monitorEnhancedSetup(TEST_CONFIG.testId, TEST_CONFIG.maxWaitMinutes);
    
    console.log('\n' + '='.repeat(60));
    if (result.success) {
      console.log('🎉 ENHANCED EC2 TEST PASSED!');
      console.log(`   Instance: ${instanceId}`);
      console.log(`   Public IP: ${publicIp}`);
      console.log(`   Final Status: ${result.status}`);
      console.log(`   Details: ${result.log}`);
    } else {
      console.log('❌ ENHANCED EC2 TEST FAILED!');
      console.log(`   Instance: ${instanceId}`);
      console.log(`   Public IP: ${publicIp}`);
      console.log(`   Final Status: ${result.status}`);
      console.log(`   Error Details: ${result.log}`);
      console.log('\n🔍 DEBUGGING OPTIONS:');
      console.log(`   SSH: ssh -i /tmp/${keyName}.pem ubuntu@${publicIp}`);
      console.log(`   Logs: tail -f /var/log/user-data.log`);
      console.log(`   Docker: docker ps -a && docker-compose logs`);
    }
  } catch (error) {
    console.log(`\n💥 ENHANCED EC2 TEST CRASHED: ${error.message}`);
    result.status = 'CRASHED';
    result.log = error.message;
  } finally {
    console.log('\n' + '='.repeat(60));
    if (!result.success && publicIp) {
      console.log('🔧 MANUAL DEBUGGING INSTRUCTIONS:');
      console.log(`   1. SSH: ssh -i /tmp/${keyName}.pem ubuntu@${publicIp}`);
      console.log(`   2. Check logs: sudo tail -f /var/log/user-data.log`);
      console.log(`   3. Check containers: docker ps -a`);
      console.log(`   4. Check Judge0 logs: cd /opt/judge0-v1.13.0 && docker-compose logs`);
      console.log(`   5. Test API manually: curl http://localhost:2358/languages`);
      console.log('\n   Press ENTER to cleanup or Ctrl+C to keep instance for debugging...');
      
      // Wait for user input before cleanup
      await new Promise(resolve => {
        process.stdin.once('data', resolve);
      });
    }
    
    await cleanupResources(instanceId, sgId, keyName);
  }
  
  const endTime = Date.now();
  const endMemory = process.memoryUsage();
  
  console.log(`\n⏱️  Total duration: ${Math.round((endTime - startTime) / 1000)}s`);
  console.log(`📊 Final memory: ${(endMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log(`📈 Memory delta: +${((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024).toFixed(2)}MB`);
  
  process.exit(result.success ? 0 : 1);
}

// Main execution
if (require.main === module) {
  runEnhancedEC2Test();
}

module.exports = { runEnhancedEC2Test }; 