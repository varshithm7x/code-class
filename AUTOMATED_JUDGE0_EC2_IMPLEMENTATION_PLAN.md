# Automated Judge0 EC2 Implementation Plan

## 🎯 Project Overview

**Objective**: Create a fully automated system that spins up Judge0 on EC2 for test sessions, handles 100+ students with 3-4 problems each having 100+ test cases, then automatically shuts down to minimize costs.

**Key Requirements**:
- Teacher schedules test → Automatic EC2 launch + Judge0 setup
- Real-time test runs during exam
- Batch processing of final submissions (100+ test cases per problem)  
- Automatic shutdown after all results processed
- Pay-per-use model (~$0.25-0.50 per test session)

---

## 🏗️ Architecture Overview

```
Teacher Schedules Test
         ↓
   AWS Lambda Trigger
         ↓
   EC2 Auto-Launch (t3.medium)
         ↓
   Judge0 Auto-Setup (Docker)
         ↓
   Health Check & Validation
         ↓
   Test Session Active
         ↓
   Final Submission Processing
         ↓
   Results Sync & Auto-Shutdown
```

---

## 📋 Phase 1: Infrastructure Setup (Week 1)

### 1.1 AWS Infrastructure Components

**EC2 Configuration**:
- **Instance Type**: t3.medium (2 vCPUs, 4GB RAM)
- **Storage**: 30GB EBS GP3 (for Judge0 + logs)
- **AMI**: Ubuntu 22.04 LTS
- **Security Groups**: HTTP (2358), SSH (22), Custom health check port

**IAM Roles & Policies**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:PutParameter",
        "cloudwatch:PutMetricData",
        "ec2:DescribeInstances",
        "ec2:TerminateInstances"
      ],
      "Resource": "*"
    }
  ]
}
```

**AWS Lambda Functions Needed**:
1. `test-scheduler-launcher` - Triggers EC2 launch
2. `judge0-health-monitor` - Monitors setup progress  
3. `test-completion-handler` - Manages shutdown

### 1.2 Terraform Infrastructure Code

**File Structure**:
```
infrastructure/
├── main.tf                    # Main terraform configuration
├── variables.tf               # Input variables
├── outputs.tf                 # Output values
├── modules/
│   ├── ec2/                   # EC2 instance module
│   ├── lambda/                # Lambda functions
│   ├── iam/                   # IAM roles and policies
│   └── monitoring/            # CloudWatch setup
└── scripts/
    ├── judge0-setup.sh        # Judge0 installation script
    ├── health-check.sh        # System validation script
    └── shutdown-handler.sh    # Cleanup script
```

---

## 📋 Phase 2: Judge0 Setup Automation (Week 2)

### 2.1 Judge0 Installation Script

**Core Setup Script** (`judge0-setup.sh`):
```bash
#!/bin/bash
set -e

# System preparation
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose awscli jq

# Download and setup Judge0
cd /opt
sudo wget https://github.com/judge0/judge0/releases/download/v1.13.0/judge0-v1.13.0.zip
sudo unzip judge0-v1.13.0.zip
cd judge0-v1.13.0

# Custom configuration for high throughput
sudo tee judge0.conf << EOF
REDIS_URL=redis://redis:6379/1
DB_HOST=db
DB_USERNAME=judge0
DB_PASSWORD=$(openssl rand -base64 32)
WORKERS_MAX=4
ENABLE_WAIT_RESULT=true
MAX_QUEUE_SIZE=1000
MAX_CPU_TIME_LIMIT=10
MAX_MEMORY_LIMIT=512000
EOF

# Start services with optimized settings
sudo docker-compose up -d db redis
sleep 15
sudo docker-compose up -d

# Wait for services to be ready
for i in {1..30}; do
  if curl -f http://localhost:2358/languages >/dev/null 2>&1; then
    echo "Judge0 is ready!"
    break
  fi
  sleep 10
done
```

### 2.2 System Validation & Health Checks

**Validation Script** (`health-check.sh`):
```bash
#!/bin/bash

# Test 1: Basic API connectivity
echo "Testing Judge0 API connectivity..."
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:2358/languages)
if [ "$response" != "200" ]; then
  echo "ERROR: Judge0 API not responding"
  exit 1
fi

# Test 2: C++ compilation and execution
echo "Testing C++ execution..."
test_result=$(curl -s -X POST "http://localhost:2358/submissions?wait=true" \
  -H "Content-Type: application/json" \
  -d '{
    "source_code": "#include <iostream>\nint main() { std::cout << \"Hello Judge0\"; return 0; }",
    "language_id": 54,
    "stdin": ""
  }')

if echo "$test_result" | jq -r '.status.description' | grep -q "Accepted"; then
  echo "SUCCESS: C++ test passed"
else
  echo "ERROR: C++ test failed"
  exit 1
fi

# Test 3: Python execution
echo "Testing Python execution..."
python_result=$(curl -s -X POST "http://localhost:2358/submissions?wait=true" \
  -H "Content-Type: application/json" \
  -d '{
    "source_code": "print(\"Hello from Python\")",
    "language_id": 71,
    "stdin": ""
  }')

if echo "$python_result" | jq -r '.status.description' | grep -q "Accepted"; then
  echo "SUCCESS: Python test passed"
else
  echo "ERROR: Python test failed"
  exit 1
fi

# Test 4: Batch submission capability
echo "Testing batch submissions..."
batch_result=$(curl -s -X POST "http://localhost:2358/submissions/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "submissions": [
      {"source_code": "print(1)", "language_id": 71},
      {"source_code": "print(2)", "language_id": 71},
      {"source_code": "print(3)", "language_id": 71}
    ]
  }')

if echo "$batch_result" | jq length | grep -q "3"; then
  echo "SUCCESS: Batch submission test passed"
else
  echo "ERROR: Batch submission test failed"
  exit 1
fi

echo "All health checks passed! Judge0 is ready for production use."
```

---

## 📋 Phase 3: Integration Layer (Week 3)

### 3.1 Test Session Management Service

**Core Service** (`test-session-manager.service.ts`):
```typescript
export class TestSessionManagerService {
  
  async scheduleTest(testDetails: TestSchedule): Promise<string> {
    // 1. Validate test parameters
    const validation = await this.validateTestConfig(testDetails);
    if (!validation.isValid) throw new Error(validation.errors);
    
    // 2. Trigger EC2 launch via Lambda
    const launchResult = await this.triggerEC2Launch(testDetails);
    
    // 3. Monitor setup progress
    const instanceReady = await this.waitForInstanceReady(launchResult.instanceId);
    
    // 4. Store session mapping
    await this.storeSessionMapping(testDetails.testId, launchResult.instanceId);
    
    return launchResult.judgeUrl;
  }
  
  private async triggerEC2Launch(testDetails: TestSchedule) {
    const lambda = new AWS.Lambda();
    
    const result = await lambda.invoke({
      FunctionName: 'test-scheduler-launcher',
      Payload: JSON.stringify({
        testId: testDetails.testId,
        expectedStudents: testDetails.studentCount,
        duration: testDetails.durationMinutes,
        problems: testDetails.problems
      })
    }).promise();
    
    return JSON.parse(result.Payload as string);
  }
  
  private async waitForInstanceReady(instanceId: string): Promise<boolean> {
    const maxWaitTime = 15 * 60 * 1000; // 15 minutes
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const healthCheck = await this.checkJudgeHealth(instanceId);
        if (healthCheck.ready) return true;
      } catch (error) {
        console.log('Waiting for instance to be ready...', error.message);
      }
      
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30s
    }
    
    throw new Error('Instance failed to become ready within timeout');
  }
}
```

### 3.2 Test Execution Handler

**Execution Service** (`judge0-execution.service.ts`):
```typescript
export class Judge0ExecutionService {
  
  async runQuickTest(submission: QuickTestSubmission): Promise<ExecutionResult> {
    // For quick test runs during the exam (1-3 test cases)
    const quickTests = submission.testCases.slice(0, 3);
    
    const batchSubmission = {
      submissions: quickTests.map(testCase => ({
        source_code: submission.sourceCode,
        language_id: submission.languageId,
        stdin: testCase.input,
        expected_output: testCase.expectedOutput,
        cpu_time_limit: 1,
        memory_limit: 128000
      }))
    };
    
    const result = await this.submitBatch(batchSubmission);
    return this.formatQuickTestResult(result);
  }
  
  async runFinalSubmission(submission: FinalSubmission): Promise<ExecutionResult> {
    // For final submissions (100+ test cases)
    const allTestCases = submission.testCases;
    
    // Process in batches of 20 (Judge0 limit)
    const batches = this.chunkArray(allTestCases, 20);
    const results = [];
    
    for (const batch of batches) {
      const batchSubmission = {
        submissions: batch.map(testCase => ({
          source_code: submission.sourceCode,
          language_id: submission.languageId,
          stdin: testCase.input,
          expected_output: testCase.expectedOutput,
          cpu_time_limit: 2,
          memory_limit: 256000
        }))
      };
      
      const batchResult = await this.submitBatch(batchSubmission);
      results.push(...batchResult);
      
      // Small delay between batches to prevent overload
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return this.calculateFinalScore(results);
  }
  
  private async submitBatch(batchSubmission: any): Promise<any[]> {
    const response = await axios.post(
      `${this.judgeUrl}/submissions/batch`,
      batchSubmission
    );
    
    // Wait for all submissions to complete
    const tokens = response.data.map(sub => sub.token);
    return await this.waitForCompletion(tokens);
  }
  
  private async waitForCompletion(tokens: string[]): Promise<any[]> {
    const results = [];
    
    for (const token of tokens) {
      let completed = false;
      while (!completed) {
        const result = await axios.get(`${this.judgeUrl}/submissions/${token}`);
        
        if (result.data.status.id > 2) { // Status > 2 means completed
          results.push(result.data);
          completed = true;
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    return results;
  }
}
```

---

## 📋 Phase 4: Monitoring & Auto-Shutdown (Week 4)

### 4.1 Test Completion Detection

**Completion Monitor** (`test-completion.service.ts`):
```typescript
export class TestCompletionService {
  
  async monitorTestProgress(testId: string): Promise<void> {
    const testSession = await this.getTestSession(testId);
    
    while (!testSession.completed) {
      const progress = await this.checkTestProgress(testId);
      
      if (progress.allStudentsSubmitted && progress.allResultsProcessed) {
        await this.initiateShutdown(testSession.instanceId);
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 60000)); // Check every minute
    }
  }
  
  private async checkTestProgress(testId: string) {
    const submissions = await this.database.submission.findMany({
      where: { testId },
      include: { results: true }
    });
    
    const totalStudents = await this.getExpectedStudentCount(testId);
    const studentsSubmitted = new Set(submissions.map(s => s.studentId)).size;
    const resultsProcessed = submissions.every(s => s.finalResultProcessed);
    
    return {
      allStudentsSubmitted: studentsSubmitted >= totalStudents,
      allResultsProcessed: resultsProcessed,
      progress: {
        submitted: studentsSubmitted,
        total: totalStudents,
        resultsProcessed: submissions.filter(s => s.finalResultProcessed).length
      }
    };
  }
  
  private async initiateShutdown(instanceId: string): Promise<void> {
    console.log(`Initiating shutdown for instance: ${instanceId}`);
    
    // 1. Stop accepting new submissions
    await this.setInstanceStatus(instanceId, 'SHUTTING_DOWN');
    
    // 2. Wait for any pending submissions to complete
    await this.waitForPendingSubmissions(instanceId);
    
    // 3. Backup logs and results
    await this.backupInstanceData(instanceId);
    
    // 4. Terminate EC2 instance
    await this.terminateInstance(instanceId);
    
    console.log(`Instance ${instanceId} successfully terminated`);
  }
}
```

### 4.2 Cost Tracking & Reporting

**Cost Monitor** (`cost-tracking.service.ts`):
```typescript
export class CostTrackingService {
  
  async trackTestCosts(testId: string): Promise<TestCostReport> {
    const session = await this.getTestSession(testId);
    
    const duration = session.endTime - session.startTime;
    const instanceCost = this.calculateEC2Cost(duration, 't3.medium');
    const storageCost = this.calculateStorageCost(duration);
    const dataCost = this.calculateDataTransferCost(session.totalRequests);
    
    return {
      testId,
      duration: duration / (1000 * 60), // minutes
      costs: {
        compute: instanceCost,
        storage: storageCost,
        dataTransfer: dataCost,
        total: instanceCost + storageCost + dataCost
      },
      metrics: {
        studentsServed: session.studentCount,
        submissionsProcessed: session.totalSubmissions,
        testCasesExecuted: session.totalTestCases
      }
    };
  }
  
  private calculateEC2Cost(durationMs: number, instanceType: string): number {
    const hourlyRates = {
      't3.medium': 0.0416, // $0.0416 per hour
      't3.large': 0.0832
    };
    
    const hours = durationMs / (1000 * 60 * 60);
    return hours * hourlyRates[instanceType];
  }
}
```

---

## 📋 Phase 5: Error Handling & Resilience (Week 5)

### 5.1 Failure Recovery Mechanisms

**Recovery Service** (`failure-recovery.service.ts`):
```typescript
export class FailureRecoveryService {
  
  async handleInstanceFailure(testId: string, instanceId: string): Promise<void> {
    console.log(`Handling failure for test ${testId}, instance ${instanceId}`);
    
    try {
      // 1. Attempt to recover pending submissions
      const pendingSubmissions = await this.getPendingSubmissions(testId);
      
      // 2. Launch backup instance
      const backupInstance = await this.launchBackupInstance(testId);
      
      // 3. Restore test state
      await this.restoreTestState(testId, backupInstance.instanceId);
      
      // 4. Retry failed submissions
      await this.retrySubmissions(pendingSubmissions, backupInstance.judgeUrl);
      
      // 5. Notify administrators
      await this.notifyFailureRecovery(testId, instanceId, backupInstance.instanceId);
      
    } catch (error) {
      // Critical failure - manual intervention required
      await this.escalateToAdmins(testId, error);
    }
  }
  
  async monitorInstanceHealth(instanceId: string): Promise<void> {
    const healthCheckInterval = 30000; // 30 seconds
    
    while (await this.isInstanceActive(instanceId)) {
      try {
        const health = await this.performHealthCheck(instanceId);
        
        if (!health.judge0Responsive) {
          await this.attemptJudge0Restart(instanceId);
        }
        
        if (health.criticalFailure) {
          await this.handleInstanceFailure(health.testId, instanceId);
          break;
        }
        
      } catch (error) {
        console.error(`Health check failed for ${instanceId}:`, error);
      }
      
      await new Promise(resolve => setTimeout(resolve, healthCheckInterval));
    }
  }
}
```

---

## 🔧 Implementation Timeline

### Week 1: Infrastructure Foundation
- [ ] Set up Terraform infrastructure code
- [ ] Create IAM roles and security groups  
- [ ] Implement basic EC2 launch/terminate functionality
- [ ] Test manual Judge0 installation

### Week 2: Automation Scripts
- [ ] Create Judge0 auto-setup script
- [ ] Implement comprehensive health checks
- [ ] Add system validation tests
- [ ] Test end-to-end deployment process

### Week 3: Integration Layer  
- [ ] Build test session management service
- [ ] Implement Judge0 execution service
- [ ] Create batch processing logic
- [ ] Add quick test vs final submission handling

### Week 4: Monitoring & Shutdown
- [ ] Implement test completion detection
- [ ] Add automatic shutdown logic
- [ ] Create cost tracking system
- [ ] Build admin notification system

### Week 5: Resilience & Testing
- [ ] Add failure recovery mechanisms
- [ ] Implement health monitoring
- [ ] Comprehensive system testing
- [ ] Performance optimization

---

## 💰 Cost Projections

**Per Test Session** (2-3 hours):
- EC2 t3.medium: ~$0.25-0.37
- Storage (30GB): ~$0.01
- Data Transfer: ~$0.05-0.15
- **Total: $0.31-0.53 per test**

**Annual Costs** (weekly tests):
- 52 tests × $0.42 average = **~$22/year**
- Compare to pooled API: $200+/month = $2,400/year
- **Savings: 99%+ cost reduction**

---

## 🔍 Success Metrics

**Performance Targets**:
- [ ] Instance ready in < 10 minutes
- [ ] 100% test case execution success rate
- [ ] < 2 minutes quick test response time
- [ ] < 10 minutes final submission processing (100 test cases)
- [ ] Zero data loss during shutdown
- [ ] < 1% system failure rate

**Cost Targets**:
- [ ] < $0.50 per test session
- [ ] < $30/year total operating cost
- [ ] 95%+ cost savings vs API approach

This implementation plan provides a robust, cost-effective solution that scales with your needs while maintaining reliability and performance. 