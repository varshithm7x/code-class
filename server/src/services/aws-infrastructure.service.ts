import AWS from 'aws-sdk';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient() as any;

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION || 'ap-south-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const ec2 = new AWS.EC2();

export interface EC2LaunchConfig {
  testId: string;
  expectedStudents: number;
  durationMinutes: number;
  problems: any[];
}

export interface EC2LaunchResult {
  instanceId: string;
  judgeUrl: string;
  publicIp: string;
}

export class AWSInfrastructureService {
  
  /**
   * Get the enhanced Judge0 setup script content
   */
  private getSetupScript(): string {
    return `#!/bin/bash
set -e

echo "🚀 Starting Judge0 setup automation..."

# System preparation
echo "📦 Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

echo "🐳 Installing Docker and dependencies..."
apt-get install -y docker.io docker-compose jq curl wget unzip bc python3-pip

echo "☁️ Installing AWS CLI..."
# Install AWS CLI v2 using the official installer
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip -q awscliv2.zip
./aws/install
rm -rf aws awscliv2.zip

# Start Docker service
systemctl start docker
systemctl enable docker
usermod -aG docker ubuntu

echo "⬇️ Downloading Judge0..."
cd /opt
wget -q https://github.com/judge0/judge0/releases/download/v1.13.0/judge0-v1.13.0.zip
unzip -q judge0-v1.13.0.zip
cd judge0-v1.13.0

# Generate secure passwords
DB_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)

echo "⚙️ Creating optimized Judge0 configuration..."
cat > judge0.conf << EOF
DB_HOST=db
DB_USERNAME=judge0
DB_PASSWORD=\${DB_PASSWORD}
REDIS_URL=redis://:\${REDIS_PASSWORD}@redis:6379/1
REDIS_PASSWORD=\${REDIS_PASSWORD}
WORKERS_MAX=4
ENABLE_WAIT_RESULT=true
MAX_QUEUE_SIZE=1000
MAX_CPU_TIME_LIMIT=10
MAX_MEMORY_LIMIT=512000
ENABLE_BATCHED_SUBMISSIONS=true
MAX_SUBMISSION_BATCH_SIZE=20
EOF

echo "🏗️ Starting Judge0 services..."
docker-compose up -d db redis
sleep 30

echo "🚀 Starting all Judge0 services..."
docker-compose up -d

echo "⏳ Waiting for Judge0 API to be ready..."
for i in {1..60}; do
  if curl -f http://localhost:2358/languages >/dev/null 2>&1; then
    echo "✅ Judge0 API is ready!"
    
    # Test basic functionality
    echo "🧪 Testing Judge0 functionality..."
    CPP_TEST=$(curl -s -X POST "http://localhost:2358/submissions?wait=true" \
      -H "Content-Type: application/json" \
      -d '{"source_code": "#include <iostream>\\nint main() { std::cout << \\"Hello Judge0\\"; return 0; }", "language_id": 54, "stdin": ""}')
    
    if echo "\$CPP_TEST" | jq -r '.status.description' | grep -q "Accepted"; then
      echo "✅ C++ test passed"
    else
      echo "❌ C++ test failed"
    fi
    
    # Signal success
    if command -v aws &> /dev/null; then
      TEST_ID=\${1:-"default"}
      aws ssm put-parameter --name "/judge0/\${TEST_ID}/status" --value "READY" --overwrite --region \${AWS_DEFAULT_REGION:-us-east-1} || echo "⚠️ Could not update SSM parameter"
    fi
    
    echo "🎉 Judge0 setup completed successfully!"
    exit 0
  fi
  echo "⏳ Waiting for Judge0 API... (\$i/60)"
  sleep 10
done

echo "❌ Judge0 setup failed"
exit 1`;
  }

  /**
   * Get the health check script content
   */
  private getHealthCheckScript(): string {
    return `#!/bin/bash
echo "🔍 Starting Judge0 health check..."

JUDGE0_URL="http://localhost:2358"

# Test API connectivity
echo "Testing Judge0 API connectivity..."
response=$(curl -s -o /dev/null -w "%{http_code}" \$JUDGE0_URL/languages)
if [ "\$response" != "200" ]; then
  echo "ERROR: Judge0 API not responding"
  exit 1
fi
echo "✅ API connectivity test passed"

# Test C++ execution
echo "Testing C++ execution..."
test_result=$(curl -s -X POST "\$JUDGE0_URL/submissions?wait=true" \
  -H "Content-Type: application/json" \
  -d '{"source_code": "#include <iostream>\\nint main() { std::cout << \\"Hello Judge0\\"; return 0; }", "language_id": 54, "stdin": ""}')

if echo "\$test_result" | jq -r '.status.description' | grep -q "Accepted"; then
  echo "✅ C++ test passed"
else
  echo "❌ C++ test failed"
  exit 1
fi

# Test batch submissions
echo "Testing batch submissions..."
batch_result=$(curl -s -X POST "\$JUDGE0_URL/submissions/batch" \
  -H "Content-Type: application/json" \
  -d '{"submissions": [{"source_code": "print(1)", "language_id": 71}, {"source_code": "print(2)", "language_id": 71}]}')

if echo "\$batch_result" | jq length | grep -q "2"; then
  echo "✅ Batch submission test passed"
else
  echo "❌ Batch submission test failed"
  exit 1
fi

echo "🎉 All health checks passed!"`;
  }

  /**
   * Get the shutdown handler script content
   */
  private getShutdownScript(): string {
    return `#!/bin/bash
echo "🔄 Starting auto-shutdown monitor..."

TEST_ID=\${1:-"default"}
AWS_REGION=\${AWS_DEFAULT_REGION:-"ap-south-1"}
CHECK_INTERVAL=60

cleanup_and_shutdown() {
    echo "🧹 Performing cleanup before shutdown..."
    cd /opt/judge0-v1.13.0
    docker-compose stop server workers
    
    echo "⏳ Waiting for pending submissions..."
    timeout=300
    while [ \$timeout -gt 0 ]; do
        pending=$(docker-compose exec -T redis redis-cli LLEN judge0:queue 2>/dev/null || echo "0")
        if [ "\$pending" = "0" ]; then
            echo "✅ All submissions completed"
            break
        fi
        sleep 10
        timeout=$((timeout - 10))
    done
    
    echo "🛑 Stopping all services..."
    docker-compose down
    
    if command -v aws &> /dev/null; then
        aws ssm put-parameter --name "/judge0/\${TEST_ID}/status" --value "TERMINATED" --overwrite --region "\$AWS_REGION" || echo "⚠️ Could not update final status"
    fi
    
    echo "✅ Cleanup completed. Shutting down..."
    shutdown -h now
}

while true; do
    if command -v aws &> /dev/null; then
        SHUTDOWN_SIGNAL=$(aws ssm get-parameter --name "/judge0/\${TEST_ID}/shutdown" --region "\$AWS_REGION" --query 'Parameter.Value' --output text 2>/dev/null || echo "false")
        
        if [ "\$SHUTDOWN_SIGNAL" = "true" ]; then
            echo "🔔 Shutdown signal received"
            cleanup_and_shutdown
            break
        fi
    fi
    
    sleep \$CHECK_INTERVAL
done`;
  }
  
  /**
   * Launch EC2 instance with Judge0 for a test session
   */
  async launchJudge0Instance(config: EC2LaunchConfig): Promise<EC2LaunchResult> {
    try {
      console.log(`Launching EC2 instance for test ${config.testId}`);
      
      // User data script for Judge0 setup
      const userData = this.generateUserDataScript(config);
      
      const params: AWS.EC2.RunInstancesRequest = {
        ImageId: 'ami-02a2af70a66af6dfb', // Ubuntu 22.04 LTS ap-south-1
        InstanceType: 't3.medium',
        MinCount: 1,
        MaxCount: 1,
        KeyName: process.env.AWS_KEY_PAIR_NAME || 'judge0-key',
        SecurityGroupIds: [process.env.AWS_SECURITY_GROUP_ID || 'sg-03a8ab26ccd8ba327'],
        SubnetId: process.env.AWS_SUBNET_ID || 'subnet-00eb82b2f3490be57',
        IamInstanceProfile: {
          Name: process.env.AWS_IAM_INSTANCE_PROFILE || 'judge0-instance-profile'
        },
        UserData: Buffer.from(userData).toString('base64'),
        BlockDeviceMappings: [{
          DeviceName: '/dev/sda1',
          Ebs: {
            VolumeSize: 30,
            VolumeType: 'gp3',
            DeleteOnTermination: true
          }
        }],
        TagSpecifications: [{
          ResourceType: 'instance',
          Tags: [
            { Key: 'Name', Value: `judge0-${config.testId}` },
            { Key: 'Project', Value: 'code-class' },
            { Key: 'TestId', Value: config.testId },
            { Key: 'AutoShutdown', Value: 'true' }
          ]
        }]
      };

      const result = await ec2.runInstances(params).promise();
      const instanceId = result.Instances![0].InstanceId!;
      
      // Wait for instance to get public IP
      await this.waitForInstanceRunning(instanceId);
      const publicIp = await this.getInstancePublicIp(instanceId);
      const judgeUrl = `http://${publicIp}:2358`;
      
      // Store instance info in database
      await prisma.judge0Instance.create({
        data: {
          testId: config.testId,
          instanceId,
          judgeUrl,
          status: 'LAUNCHING',
          studentsServed: config.expectedStudents
        }
      });
      
      console.log(`EC2 instance ${instanceId} launched for test ${config.testId}`);
      return { instanceId, judgeUrl, publicIp };
      
    } catch (error) {
      console.error('Failed to launch EC2 instance:', error);
      throw new Error(`EC2 launch failed: ${(error as any)?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Wait for EC2 instance to be in running state
   */
  private async waitForInstanceRunning(instanceId: string): Promise<void> {
    const maxWaitTime = 5 * 60 * 1000; // 5 minutes
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const result = await ec2.describeInstances({
        InstanceIds: [instanceId]
      }).promise();
      
      const instance = result.Reservations![0].Instances![0];
      if (instance.State!.Name === 'running') {
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s
    }
    
    throw new Error('Instance failed to reach running state within timeout');
  }
  
  /**
   * Get public IP of EC2 instance
   */
  private async getInstancePublicIp(instanceId: string): Promise<string> {
    const result = await ec2.describeInstances({
      InstanceIds: [instanceId]
    }).promise();
    
    const instance = result.Reservations![0].Instances![0];
    const publicIp = instance.PublicIpAddress;
    
    if (!publicIp) {
      throw new Error('Instance does not have a public IP address');
    }
    
    return publicIp;
  }
  
  /**
   * Generate user data script for Judge0 setup
   */
  private generateUserDataScript(config: EC2LaunchConfig): string {
    return `#!/bin/bash
set -e

# Set environment variables for scripts
export TEST_ID="${config.testId}"
export AWS_DEFAULT_REGION="${process.env.AWS_REGION || 'ap-south-1'}"

# Download and execute enhanced setup script
cd /tmp
cat > judge0-setup.sh << 'SETUP_SCRIPT'
${this.getSetupScript()}
SETUP_SCRIPT

chmod +x judge0-setup.sh
./judge0-setup.sh "${config.testId}"

# Download and setup health check script
cat > /opt/health-check.sh << 'HEALTH_SCRIPT'
${this.getHealthCheckScript()}
HEALTH_SCRIPT

chmod +x /opt/health-check.sh

# Download and setup shutdown handler
cat > /opt/shutdown-handler.sh << 'SHUTDOWN_SCRIPT'
${this.getShutdownScript()}
SHUTDOWN_SCRIPT

chmod +x /opt/shutdown-handler.sh

# Start shutdown monitor in background
nohup /opt/shutdown-handler.sh "${config.testId}" > /var/log/shutdown-handler.log 2>&1 &

echo "Enhanced Judge0 setup with monitoring completed"`;
  }
  
  /**
   * Terminate EC2 instance
   */
  async terminateInstance(instanceId: string): Promise<void> {
    try {
      console.log(`Terminating EC2 instance: ${instanceId}`);
      
      // Signal instance to shutdown gracefully
      await this.signalShutdown(instanceId);
      
      // Wait a bit for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      // Force terminate
      await ec2.terminateInstances({
        InstanceIds: [instanceId]
      }).promise();
      
      // Update database
      await prisma.judge0Instance.updateMany({
        where: { instanceId },
        data: {
          status: 'TERMINATED',
          shutdownAt: new Date()
        }
      });
      
      console.log(`Instance ${instanceId} terminated successfully`);
      
    } catch (error) {
      console.error(`Failed to terminate instance ${instanceId}:`, error);
      throw error as Error;
    }
  }
  
  /**
   * Signal instance to shutdown via SSM parameter
   */
  private async signalShutdown(instanceId: string): Promise<void> {
    const ssm = new AWS.SSM();
    
    // Get testId from instance tags
    const result = await ec2.describeInstances({
      InstanceIds: [instanceId]
    }).promise();
    
    const instance = result.Reservations![0].Instances![0];
    const testIdTag = instance.Tags?.find(tag => tag.Key === 'TestId');
    
    if (testIdTag?.Value) {
      await ssm.putParameter({
        Name: `/judge0/${testIdTag.Value}/shutdown`,
        Value: 'true',
        Overwrite: true
      }).promise();
    }
  }
  
  /**
   * Check instance health status
   */
  async checkInstanceHealth(instanceId: string): Promise<boolean> {
    try {
      const result = await ec2.describeInstances({
        InstanceIds: [instanceId]
      }).promise();
      
      const instance = result.Reservations![0].Instances![0];
      return instance.State!.Name === 'running';
      
    } catch (error) {
      console.error(`Health check failed for ${instanceId}:`, error);
      return false;
    }
  }
  
  /**
   * Calculate EC2 costs for an instance
   */
  calculateInstanceCost(launchedAt: Date, shutdownAt: Date | null): number {
    const endTime = shutdownAt || new Date();
    const durationMs = endTime.getTime() - launchedAt.getTime();
    const hours = durationMs / (1000 * 60 * 60);
    
    // t3.medium hourly rate
    const hourlyRate = 0.0416;
    return Math.round(hours * hourlyRate * 100) / 100; // Round to 2 decimal places
  }
} 