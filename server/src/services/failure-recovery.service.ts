import { PrismaClient } from '@prisma/client';
import { AWSInfrastructureService } from './aws-infrastructure.service';
import { Judge0AutomationService } from './judge0-automation.service';
import { AdminNotificationService } from './admin-notification.service';

const prisma = new PrismaClient();

export interface FailureType {
  type: 'INSTANCE_LAUNCH_FAILED' | 'JUDGE0_SETUP_FAILED' | 'HEALTH_CHECK_FAILED' | 'SUBMISSION_TIMEOUT' | 'NETWORK_ERROR' | 'RESOURCE_EXHAUSTED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  retryable: boolean;
}

export interface RecoveryPlan {
  testId: string;
  failureType: FailureType;
  recoveryActions: string[];
  estimatedRecoveryTime: number; // minutes
  backupInstanceRequired: boolean;
  manualInterventionRequired: boolean;
}

export interface HealthCheckResult {
  testId: string;
  instanceId: string;
  judge0Health: {
    apiResponsive: boolean;
    languagesAvailable: boolean;
    executionWorking: boolean;
  };
  instanceHealth: {
    ec2Running: boolean;
    diskSpace: number; // percentage
    memory: number; // percentage
    cpu: number; // percentage
  };
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'FAILED';
  issues: string[];
}

export class FailureRecoveryService {
  private awsService = new AWSInfrastructureService();
  private judge0Service = new Judge0AutomationService();
  private notificationService = new AdminNotificationService();
  private recoveryAttempts = new Map<string, number>();

  /**
   * Handle instance failure with automatic recovery
   */
  async handleInstanceFailure(testId: string, instanceId: string, failureType: FailureType): Promise<void> {
    console.log(`Handling failure for test ${testId}, instance ${instanceId}, type: ${failureType.type}`);
    
    try {
      // Record failure
      await this.recordFailure(testId, instanceId, failureType);
      
      // Generate recovery plan
      const recoveryPlan = await this.generateRecoveryPlan(testId, failureType);
      
      // Notify administrators immediately for critical failures
      if (failureType.severity === 'CRITICAL') {
        await this.notificationService.notifyTestFailure(testId, {
          message: `Critical failure in test ${testId}`,
          failureType: failureType.type,
          instanceId,
          recoveryPlan
        }, instanceId);
      }
      
      // Attempt recovery if retryable
      if (failureType.retryable && !recoveryPlan.manualInterventionRequired) {
        await this.attemptAutomatedRecovery(testId, instanceId, recoveryPlan);
      } else {
        await this.escalateToAdmins(testId, failureType, recoveryPlan);
      }
      
    } catch (error) {
      console.error(`Recovery failed for test ${testId}:`, error);
      await this.escalateToAdmins(testId, failureType, null);
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(testId: string): Promise<HealthCheckResult> {
    const instance = await this.getJudge0Instance(testId);
    if (!instance) {
      throw new Error(`No instance found for test ${testId}`);
    }

    const result: HealthCheckResult = {
      testId,
      instanceId: instance.instanceId,
      judge0Health: {
        apiResponsive: false,
        languagesAvailable: false,
        executionWorking: false
      },
      instanceHealth: {
        ec2Running: false,
        diskSpace: 0,
        memory: 0,
        cpu: 0
      },
      overallStatus: 'FAILED',
      issues: []
    };

    try {
      // Check EC2 instance health
      const ec2Health = await this.checkEC2Health(instance.instanceId);
      result.instanceHealth = ec2Health;

      if (!ec2Health.ec2Running) {
        result.issues.push('EC2 instance not running');
        result.overallStatus = 'FAILED';
        return result;
      }

      // Check Judge0 API health
      const judge0Health = await this.checkJudge0Health(instance.judgeUrl);
      result.judge0Health = judge0Health;

      // Determine overall status
      result.overallStatus = this.determineOverallHealth(result);
      
      // Update last health check timestamp
      await this.updateHealthCheckTimestamp(testId);

      return result;

    } catch (error) {
      console.error(`Health check failed for test ${testId}:`, error);
      result.issues.push(`Health check error: ${error}`);
      result.overallStatus = 'FAILED';
      return result;
    }
  }

  /**
   * Monitor instance health continuously
   */
  async startHealthMonitoring(testId: string): Promise<void> {
    const monitoringInterval = 30000; // 30 seconds
    
    const monitor = async () => {
      try {
        const health = await this.performHealthCheck(testId);
        
        if (health.overallStatus === 'FAILED' || health.overallStatus === 'CRITICAL') {
          const failureType: FailureType = {
            type: 'HEALTH_CHECK_FAILED',
            severity: health.overallStatus === 'FAILED' ? 'HIGH' : 'CRITICAL',
            retryable: true
          };
          
          await this.handleInstanceFailure(testId, health.instanceId, failureType);
        } else if (health.overallStatus === 'DEGRADED') {
          console.log(`Instance ${health.instanceId} showing degraded performance`);
          // Log warning but continue monitoring
        }
        
      } catch (error) {
        console.error(`Health monitoring failed for ${testId}:`, error);
      }
    };

    // Start monitoring
    monitor();
    const intervalId = setInterval(monitor, monitoringInterval);
    
    // Store interval ID for cleanup
    (this as any).monitoringIntervals = (this as any).monitoringIntervals || new Map();
    (this as any).monitoringIntervals.set(testId, intervalId);
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(testId: string): void {
    const intervals = (this as any).monitoringIntervals;
    if (intervals && intervals.has(testId)) {
      clearInterval(intervals.get(testId));
      intervals.delete(testId);
      console.log(`Stopped health monitoring for test ${testId}`);
    }
  }

  /**
   * Attempt automated recovery
   */
  private async attemptAutomatedRecovery(testId: string, instanceId: string, plan: RecoveryPlan): Promise<void> {
    const attempts = this.recoveryAttempts.get(testId) || 0;
    const maxAttempts = 3;

    if (attempts >= maxAttempts) {
      console.log(`Max recovery attempts reached for test ${testId}`);
      await this.escalateToAdmins(testId, plan.failureType, plan);
      return;
    }

    this.recoveryAttempts.set(testId, attempts + 1);
    console.log(`Recovery attempt ${attempts + 1} for test ${testId}`);

    try {
      if (plan.backupInstanceRequired) {
        await this.launchBackupInstance(testId);
      } else {
        await this.restartServices(testId, instanceId);
      }

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, plan.estimatedRecoveryTime * 60 * 1000));

      // Validate recovery
      const health = await this.performHealthCheck(testId);
      if (health.overallStatus === 'HEALTHY' || health.overallStatus === 'DEGRADED') {
        console.log(`Recovery successful for test ${testId}`);
        this.recoveryAttempts.delete(testId);
        
        await this.notificationService.notifyTestFailure(testId, {
          message: `Test ${testId} recovered successfully`,
          recoveryAttempt: attempts + 1
        });
      } else {
        throw new Error('Recovery validation failed');
      }

    } catch (error) {
      console.error(`Recovery attempt ${attempts + 1} failed for test ${testId}:`, error);
      await this.attemptAutomatedRecovery(testId, instanceId, plan);
    }
  }

  /**
   * Launch backup instance
   */
  private async launchBackupInstance(testId: string): Promise<void> {
    console.log(`Launching backup instance for test ${testId}`);
    
    // Get test details
    const test = await prisma.codingTest.findUnique({
      where: { id: testId },
      include: { problems: true }
    });

    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    // Schedule new instance
    await this.judge0Service.scheduleTest({
      testId,
      studentCount: 50, // Estimated
      durationMinutes: test.duration,
      problems: test.problems.map(p => ({
        id: p.id,
        title: p.title,
        testCases: p.testCases
      })),
      startTime: new Date()
    });
  }

  /**
   * Restart services on existing instance
   */
  private async restartServices(testId: string, instanceId: string): Promise<void> {
    console.log(`Restarting services for instance ${instanceId}`);
    
    // This would use AWS SSM to restart Judge0 services
    // For now, we'll simulate the restart
    await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second restart
  }

  /**
   * Helper methods
   */
  private async checkEC2Health(instanceId: string): Promise<any> {
    // Mock EC2 health check - in reality would use AWS SDK
    return {
      ec2Running: true,
      diskSpace: 85,
      memory: 70,
      cpu: 60
    };
  }

  private async checkJudge0Health(judgeUrl: string): Promise<any> {
    // Mock Judge0 health check - in reality would make HTTP requests
    return {
      apiResponsive: true,
      languagesAvailable: true,
      executionWorking: true
    };
  }

  private determineOverallHealth(result: HealthCheckResult): 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'FAILED' {
    if (!result.instanceHealth.ec2Running) return 'FAILED';
    if (!result.judge0Health.apiResponsive) return 'CRITICAL';
    if (!result.judge0Health.executionWorking) return 'CRITICAL';
    
    const diskUsage = result.instanceHealth.diskSpace;
    const memoryUsage = result.instanceHealth.memory;
    const cpuUsage = result.instanceHealth.cpu;
    
    if (diskUsage > 90 || memoryUsage > 90 || cpuUsage > 90) return 'CRITICAL';
    if (diskUsage > 80 || memoryUsage > 80 || cpuUsage > 80) return 'DEGRADED';
    
    return 'HEALTHY';
  }

  private async generateRecoveryPlan(testId: string, failureType: FailureType): Promise<RecoveryPlan> {
    return {
      testId,
      failureType,
      recoveryActions: this.getRecoveryActions(failureType),
      estimatedRecoveryTime: this.getEstimatedRecoveryTime(failureType),
      backupInstanceRequired: failureType.type === 'INSTANCE_LAUNCH_FAILED',
      manualInterventionRequired: failureType.severity === 'CRITICAL'
    };
  }

  private getRecoveryActions(failureType: FailureType): string[] {
    const actions = {
      'INSTANCE_LAUNCH_FAILED': ['Launch backup instance', 'Restore test state'],
      'JUDGE0_SETUP_FAILED': ['Restart Judge0 services', 'Validate installation'],
      'HEALTH_CHECK_FAILED': ['Diagnose issue', 'Restart services if needed'],
      'SUBMISSION_TIMEOUT': ['Clear queue', 'Restart worker processes'],
      'NETWORK_ERROR': ['Check connectivity', 'Restart network services'],
      'RESOURCE_EXHAUSTED': ['Free up resources', 'Scale instance if needed']
    };
    
    return actions[failureType.type] || ['Manual investigation required'];
  }

  private getEstimatedRecoveryTime(failureType: FailureType): number {
    const times = {
      'INSTANCE_LAUNCH_FAILED': 10,
      'JUDGE0_SETUP_FAILED': 5,
      'HEALTH_CHECK_FAILED': 2,
      'SUBMISSION_TIMEOUT': 1,
      'NETWORK_ERROR': 3,
      'RESOURCE_EXHAUSTED': 5
    };
    
    return times[failureType.type] || 15;
  }

  private async recordFailure(testId: string, instanceId: string, failureType: FailureType): Promise<void> {
    // Record failure in database for analysis
    console.log(`Recording failure: ${testId}, ${instanceId}, ${failureType.type}`);
  }

  private async updateHealthCheckTimestamp(testId: string): Promise<void> {
    await prisma.judge0Instance.update({
      where: { testId },
      data: { lastHealthCheck: new Date() }
    });
  }

  private async escalateToAdmins(testId: string, failureType: FailureType, plan: RecoveryPlan | null): Promise<void> {
    await this.notificationService.notifyTestFailure(testId, {
      message: `Manual intervention required for test ${testId}`,
      failureType: failureType.type,
      severity: failureType.severity,
      recoveryPlan: plan
    });
  }

  private async getJudge0Instance(testId: string) {
    return await prisma.judge0Instance.findUnique({
      where: { testId }
    });
  }
} 