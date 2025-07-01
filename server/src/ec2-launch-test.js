#!/usr/bin/env node

// EC2 Launch Test - Real AWS instance creation and termination
// Tests actual EC2 lifecycle with Judge0 setup

// Load environment variables from .env file
require('dotenv').config();

const AWS = require('aws-sdk');

console.log('🚀 EC2 Launch Test\n');

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION || 'ap-south-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const ec2 = new AWS.EC2();
const ssm = new AWS.SSM();

// Test configuration
const TEST_CONFIG = {
  testId: `test-${Date.now()}`,
  instanceType: 't3.small', // Smaller for testing, cheaper
  maxWaitMinutes: 10, // Max time to wait for setup
  region: AWS.config.region
};

// Basic user data script for testing (minimal Judge0 setup)
function getBasicUserDataScript(testId) {
  return Buffer.from(`#!/bin/bash
echo "🚀 Starting Judge0 test setup..."
apt-get update -y
apt-get install -y docker.io docker-compose curl jq unzip python3-pip

# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip -q awscliv2.zip
./aws/install
rm -rf aws awscliv2.zip

# Start Docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ubuntu

cd /opt
wget -q https://github.com/judge0/judge0/releases/download/v1.13.0/judge0-v1.13.0.zip
unzip -q judge0-v1.13.0.zip
cd judge0-v1.13.0

docker-compose up -d db redis
sleep 30
docker-compose up -d

for i in {1..30}; do
  if curl -f http://localhost:2358/languages >/dev/null 2>&1; then
    aws ssm put-parameter --name "/judge0/${testId}/status" --value "READY" --overwrite --region ${AWS.config.region}
    exit 0
  fi
  sleep 10
done

aws ssm put-parameter --name "/judge0/${testId}/status" --value "FAILED" --overwrite --region ${AWS.config.region}
`).toString('base64');
}

async function getDefaultVPCInfo() {
  console.log('🔍 Finding default VPC and subnet...');
  
  try {
    // Get default VPC
    const vpcs = await ec2.describeVpcs({
      Filters: [{ Name: 'isDefault', Values: ['true'] }]
    }).promise();
    
    if (vpcs.Vpcs.length === 0) {
      throw new Error('No default VPC found');
    }
    
    const vpcId = vpcs.Vpcs[0].VpcId;
    console.log(`   Default VPC: ${vpcId}`);
    
    // Get a public subnet
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
    const sgName = `judge0-test-${TEST_CONFIG.testId}`;
    
    const sg = await ec2.createSecurityGroup({
      GroupName: sgName,
      Description: 'Judge0 test security group',
      VpcId: vpcId
    }).promise();
    
    const sgId = sg.GroupId;
    console.log(`   Created security group: ${sgId}`);
    
    // Add HTTP rule for Judge0 API (only for testing)
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
        }
      ]
    }).promise();
    
    console.log('   Added SSH and Judge0 API access rules');
    return sgId;
  } catch (error) {
    console.log(`   ❌ Security group creation failed: ${error.message}`);
    throw error;
  }
}

async function getLatestUbuntuAMI() {
  console.log('🔍 Using Ubuntu 24.04 LTS AMI for ap-south-1...');
  
  const amiId = 'ami-0f918f7e67a3323f0'; // Ubuntu 24.04 LTS for ap-south-1
  console.log(`   Ubuntu 24.04 AMI: ${amiId} (Noble Numbat)`);
  
  return amiId;
}

async function launchTestInstance(amiId, subnetId, sgId) {
  console.log('🚀 Launching EC2 instance...');
  
  try {
    const params = {
      ImageId: amiId,
      InstanceType: TEST_CONFIG.instanceType,
      MinCount: 1,
      MaxCount: 1,
      SubnetId: subnetId,
      SecurityGroupIds: [sgId],
      UserData: getBasicUserDataScript(TEST_CONFIG.testId),
      TagSpecifications: [
        {
          ResourceType: 'instance',
          Tags: [
            { Key: 'Name', Value: `Judge0-Test-${TEST_CONFIG.testId}` },
            { Key: 'TestId', Value: TEST_CONFIG.testId },
            { Key: 'Purpose', Value: 'Judge0-Testing' },
            { Key: 'AutoTerminate', Value: 'true' }
          ]
        }
      ]
    };
    
    const result = await ec2.runInstances(params).promise();
    const instanceId = result.Instances[0].InstanceId;
    
    console.log(`   Instance launched: ${instanceId}`);
    console.log(`   Instance type: ${TEST_CONFIG.instanceType}`);
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
    return publicIp;
  } catch (error) {
    console.log(`   ❌ Instance failed to start: ${error.message}`);
    throw error;
  }
}

async function monitorSetupProgress(testId, maxMinutes = 10) {
  console.log('📊 Monitoring Judge0 setup progress...');
  
  const maxAttempts = maxMinutes * 2; // Check every 30 seconds
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const param = await ssm.getParameter({
        Name: `/judge0/${testId}/status`
      }).promise();
      
      const status = param.Parameter.Value;
      console.log(`   Status check ${attempt}/${maxAttempts}: ${status}`);
      
      if (status === 'READY') {
        console.log('   ✅ Judge0 setup completed successfully!');
        return true;
      } else if (status.includes('FAILED') || status.includes('ERROR')) {
        console.log(`   ❌ Setup failed with status: ${status}`);
        return false;
      }
    } catch (error) {
      if (error.code !== 'ParameterNotFound') {
        console.log(`   ⚠️ Status check error: ${error.message}`);
      }
    }
    
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
    }
  }
  
  console.log('   ⏰ Setup timeout - Judge0 did not become ready in time');
  return false;
}

async function cleanupResources(instanceId, sgId) {
  console.log('🧹 Cleaning up resources...');
  
  try {
    // Terminate instance
    if (instanceId) {
      await ec2.terminateInstances({ InstanceIds: [instanceId] }).promise();
      console.log(`   Terminated instance: ${instanceId}`);
      
      // Wait for termination
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
    
    // Cleanup SSM parameter
    try {
      await ssm.deleteParameter({ Name: `/judge0/${TEST_CONFIG.testId}/status` }).promise();
      console.log('   Cleaned up SSM parameter');
    } catch (error) {
      // Ignore if parameter doesn't exist
    }
  } catch (error) {
    console.log(`   ⚠️ Cleanup warning: ${error.message}`);
  }
}

async function runEC2LaunchTest() {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();
  
  console.log(`📊 Initial memory: ${(startMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log(`🎯 Test ID: ${TEST_CONFIG.testId}`);
  console.log(`🌍 Region: ${TEST_CONFIG.region}\n`);
  
  let instanceId = null;
  let sgId = null;
  let success = false;
  
  try {
    // Step 1: Prepare infrastructure
    const { vpcId, subnetId } = await getDefaultVPCInfo();
    sgId = await createSecurityGroup(vpcId);
    const amiId = await getLatestUbuntuAMI();
    
    // Step 2: Launch instance
    instanceId = await launchTestInstance(amiId, subnetId, sgId);
    const publicIp = await waitForInstanceReady(instanceId);
    
    // Step 3: Monitor setup
    console.log('');
    const setupSuccess = await monitorSetupProgress(TEST_CONFIG.testId, TEST_CONFIG.maxWaitMinutes);
    
    if (setupSuccess) {
      console.log('\n🎉 EC2 Launch Test PASSED!');
      console.log(`   Instance: ${instanceId}`);
      console.log(`   Public IP: ${publicIp}`);
      console.log('   Judge0 setup completed successfully');
      success = true;
    } else {
      console.log('\n❌ EC2 Launch Test FAILED!');
      console.log('   Judge0 setup did not complete successfully');
    }
  } catch (error) {
    console.log(`\n💥 EC2 Launch Test CRASHED: ${error.message}`);
  } finally {
    // Always cleanup
    console.log('');
    await cleanupResources(instanceId, sgId);
  }
  
  const endTime = Date.now();
  const endMemory = process.memoryUsage();
  
  console.log(`\n⏱️  Total duration: ${Math.round((endTime - startTime) / 1000)}s`);
  console.log(`📊 Final memory: ${(endMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log(`📈 Memory delta: +${((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024).toFixed(2)}MB`);
  
  if (success) {
    console.log('\n✅ Ready to proceed with full Judge0 integration testing');
    process.exit(0);
  } else {
    console.log('\n🔧 Fix issues before proceeding to integration testing');
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  runEC2LaunchTest().then(success => {
    process.exit(success ? 0 : 1);
  });
} 