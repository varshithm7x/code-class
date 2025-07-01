#!/usr/bin/env node

// AWS Connectivity Test - Pure JavaScript, minimal memory usage
// Tests AWS credentials, permissions, and basic EC2 access

// Load environment variables from .env file
require('dotenv').config();

const AWS = require('aws-sdk');

console.log('🔧 AWS Connectivity Test\n');

// Configure AWS from environment
AWS.config.update({
  region: process.env.AWS_REGION || 'ap-south-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const ec2 = new AWS.EC2();
const ssm = new AWS.SSM();

async function testAWSCredentials() {
  console.log('✅ Testing AWS credentials...');
  
  try {
    // Test basic AWS STS to verify credentials
    const sts = new AWS.STS();
    const identity = await sts.getCallerIdentity().promise();
    
    console.log(`   Account: ${identity.Account}`);
    console.log(`   User ARN: ${identity.Arn}`);
    console.log('   ✅ Credentials VALID\n');
    return true;
  } catch (error) {
    console.log(`   ❌ Credentials FAILED: ${error.message}\n`);
    return false;
  }
}

async function testEC2Permissions() {
  console.log('✅ Testing EC2 permissions...');
  
  try {
    // Test describe instances (read permission)
    const instances = await ec2.describeInstances({ MaxResults: 5 }).promise();
    console.log(`   Found ${instances.Reservations.length} reservations`);
    console.log('   ✅ EC2 Read permissions OK');
    
    // Test describe images (needed for launch)
    const images = await ec2.describeImages({ 
      Owners: ['amazon'],
      Filters: [
        { Name: 'name', Values: ['ubuntu/images/hvm-ssd/ubuntu-22.04-amd64-server-*'] },
        { Name: 'state', Values: ['available'] }
      ],
      MaxResults: 1
    }).promise();
    console.log(`   Found ${images.Images.length} Ubuntu AMIs`);
    console.log('   ✅ AMI access OK\n');
    return true;
  } catch (error) {
    console.log(`   ❌ EC2 permissions FAILED: ${error.message}\n`);
    return false;
  }
}

async function testVPCAccess() {
  console.log('✅ Testing VPC access...');
  
  try {
    // Test VPC describe (needed for instance launch)
    const vpcs = await ec2.describeVpcs({ MaxResults: 5 }).promise();
    console.log(`   Found ${vpcs.Vpcs.length} VPCs`);
    
    // Test security groups
    const sgs = await ec2.describeSecurityGroups({ MaxResults: 5 }).promise();
    console.log(`   Found ${sgs.SecurityGroups.length} Security Groups`);
    console.log('   ✅ VPC access OK\n');
    return true;
  } catch (error) {
    console.log(`   ❌ VPC access FAILED: ${error.message}\n`);
    return false;
  }
}

async function testSSMAccess() {
  console.log('✅ Testing SSM (Systems Manager) access...');
  
  try {
    // Test SSM parameter access (needed for status updates)
    const testParam = '/judge0/connectivity-test/status';
    
    await ssm.putParameter({
      Name: testParam,
      Value: 'test-connection',
      Type: 'String',
      Overwrite: true
    }).promise();
    
    console.log(`   Created test parameter: ${testParam}`);
    
    const param = await ssm.getParameter({ Name: testParam }).promise();
    console.log(`   Retrieved parameter value: ${param.Parameter.Value}`);
    
    // Cleanup test parameter
    await ssm.deleteParameter({ Name: testParam }).promise();
    console.log('   Cleaned up test parameter');
    console.log('   ✅ SSM access OK\n');
    return true;
  } catch (error) {
    console.log(`   ❌ SSM access FAILED: ${error.message}\n`);
    return false;
  }
}

async function testRegionAndZones() {
  console.log('✅ Testing region and availability zones...');
  
  try {
    // Test availability zones
    const zones = await ec2.describeAvailabilityZones().promise();
    console.log(`   Region: ${AWS.config.region}`);
    console.log(`   Available zones: ${zones.AvailabilityZones.map(z => z.ZoneName).join(', ')}`);
    console.log('   ✅ Region access OK\n');
    return true;
  } catch (error) {
    console.log(`   ❌ Region access FAILED: ${error.message}\n`);
    return false;
  }
}

async function runAWSConnectivityTests() {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();
  
  console.log(`📊 Initial memory: ${(startMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log(`🌍 Target region: ${AWS.config.region}\n`);
  
  const tests = [
    { name: 'AWS Credentials', test: testAWSCredentials },
    { name: 'EC2 Permissions', test: testEC2Permissions },
    { name: 'VPC Access', test: testVPCAccess },
    { name: 'SSM Access', test: testSSMAccess },
    { name: 'Region/Zones', test: testRegionAndZones }
  ];
  
  let passed = 0;
  let criticalFailures = [];
  
  for (const { name, test } of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        criticalFailures.push(name);
      }
    } catch (error) {
      console.log(`   💥 ${name} crashed: ${error.message}\n`);
      criticalFailures.push(name);
    }
  }
  
  const endTime = Date.now();
  const endMemory = process.memoryUsage();
  
  console.log(`🎯 Results: ${passed}/${tests.length} tests passed`);
  console.log(`⏱️  Duration: ${endTime - startTime}ms`);
  console.log(`📊 Final memory: ${(endMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log(`📈 Memory delta: +${((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024).toFixed(2)}MB`);
  
  if (passed === tests.length) {
    console.log('\n🎉 AWS connectivity fully validated!');
    console.log('✅ Ready to proceed with EC2 instance testing');
    process.exit(0);
  } else {
    console.log(`\n❌ Critical failures in: ${criticalFailures.join(', ')}`);
    console.log('🔧 Fix these issues before proceeding to EC2 testing');
    process.exit(1);
  }
}

// Check for required environment variables
function checkEnvironment() {
  const required = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.log('❌ Missing required environment variables:');
    missing.forEach(key => console.log(`   - ${key}`));
    console.log('\n💡 Set these variables or use AWS credentials file');
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  checkEnvironment();
  runAWSConnectivityTests().catch(error => {
    console.error('\n💥 Test suite crashed:', error);
    process.exit(1);
  });
} 