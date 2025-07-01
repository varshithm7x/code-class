import { PrismaClient } from '@prisma/client';
import { AWSInfrastructureService } from './aws-infrastructure.service';
import { CostTrackingService } from './cost-tracking.service';

const prisma = new PrismaClient();

export interface TestCompletionStatus {
  testId: string;
  isComplete: boolean;
  studentsSubmitted: number;
  totalStudents: number;
  submissionsProcessed: number;
  totalSubmissions: number;
  shutdownReady: boolean;
  estimatedTimeRemaining?: number;
}

export interface ShutdownRequest {
  testId: string;
  instanceId: string;
  reason: 'AUTO_COMPLETION' | 'MANUAL' | 'EMERGENCY' | 'TIMEOUT';
  forceShutdown?: boolean;
}

export class TestCompletionDetectorService {
  private awsService = new AWSInfrastructureService();
  private costService = new CostTrackingService();
  private monitoringIntervals = new Map<string, NodeJS.Timeout>();

  /**
   * Start monitoring test completion for automatic shutdown
   */
  async startMonitoring(testId: string): Promise<void> {
    if (this.monitoringIntervals.has(testId)) {
      console.log(`Already monitoring test ${testId}`);
      return;
    }

    console.log(`Starting completion monitoring for test ${testId}`);

    const interval = setInterval(async () => {
      try {
        await this.checkAndHandleCompletion(testId);
      } catch (error) {
        console.error(`Error monitoring test ${testId}:`, error);
      }
    }, 60000); // Check every minute

    this.monitoringIntervals.set(testId, interval);
  }

  /**
   * Stop monitoring test completion
   */
  stopMonitoring(testId: string): void {
    const interval = this.monitoringIntervals.get(testId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(testId);
      console.log(`Stopped monitoring test ${testId}`);
    }
  }

  /**
   * Check test completion and trigger shutdown if ready
   */
  private async checkAndHandleCompletion(testId: string): Promise<void> {
    const status = await this.getTestCompletionStatus(testId);
    
    if (status.shutdownReady) {
      console.log(`Test ${testId} is ready for shutdown`);
      
      const instance = await this.getJudge0Instance(testId);
      if (instance && instance.status !== 'TERMINATED') {
        await this.initiateShutdown({
          testId,
          instanceId: instance.instanceId,
          reason: 'AUTO_COMPLETION'
        });
      }
    }
  }

  /**
   * Get detailed test completion status
   */
  async getTestCompletionStatus(testId: string): Promise<TestCompletionStatus> {
    const instance = await this.getJudge0Instance(testId);
    if (!instance) {
      throw new Error(`No Judge0 instance found for test ${testId}`);
    }

    const submissions = await prisma.testSubmission.findMany({
      where: { 
        session: { testId }
      },
      include: { session: true }
    });

    const totalStudents = instance.studentsServed;
    const studentsSubmitted = new Set(submissions.map((s: any) => s.session.userId)).size;
    
    const completedSubmissions = submissions.filter((s: any) => s.status !== 'PENDING');
    const submissionsProcessed = completedSubmissions.length;
    const totalSubmissions = submissions.length;

    // Calculate if we're ready to shutdown
    const allStudentsSubmitted = studentsSubmitted >= totalStudents;
    const allSubmissionsProcessed = submissionsProcessed === totalSubmissions;
    const hasMinimumWaitTime = this.hasMinimumWaitTimePassed(instance.createdAt);
    
    const shutdownReady = allStudentsSubmitted && allSubmissionsProcessed && hasMinimumWaitTime;

    return {
      testId,
      isComplete: allStudentsSubmitted && allSubmissionsProcessed,
      studentsSubmitted,
      totalStudents,
      submissionsProcessed,
      totalSubmissions,
      shutdownReady,
      estimatedTimeRemaining: this.estimateTimeRemaining(submissions)
    };
  }

  /**
   * Initiate shutdown process
   */
  async initiateShutdown(request: ShutdownRequest): Promise<void> {
    console.log(`Initiating shutdown for test ${request.testId}, reason: ${request.reason}`);

    try {
      // 1. Update instance status
      await this.updateInstanceStatus(request.testId, 'SHUTTING_DOWN');

      // 2. Stop monitoring
      this.stopMonitoring(request.testId);

      // 3. Wait for any pending submissions (unless forced)
      if (!request.forceShutdown) {
        await this.waitForPendingSubmissions(request.testId);
      }

      // 4. Calculate final costs
      const finalCost = await this.costService.calculateFinalCost(request.testId);
      
      // 5. Store shutdown metrics
      await this.storeShutdownMetrics(request.testId, {
        reason: request.reason,
        finalCost,
        shutdownTime: new Date()
      });

      // 6. Terminate EC2 instance
      await this.awsService.terminateInstance(request.instanceId);

      // 7. Update final status
      await this.updateInstanceStatus(request.testId, 'TERMINATED');

      console.log(`Successfully shut down test ${request.testId}`);

    } catch (error) {
      console.error(`Error during shutdown of test ${request.testId}:`, error);
      
      // Emergency shutdown
      if (!request.forceShutdown) {
        await this.initiateShutdown({
          ...request,
          reason: 'EMERGENCY',
          forceShutdown: true
        });
      }
    }
  }

  /**
   * Manual shutdown request
   */
  async requestManualShutdown(testId: string): Promise<void> {
    const instance = await this.getJudge0Instance(testId);
    if (!instance) {
      throw new Error(`No instance found for test ${testId}`);
    }

    await this.initiateShutdown({
      testId,
      instanceId: instance.instanceId,
      reason: 'MANUAL'
    });
  }

  /**
   * Emergency shutdown (force terminate)
   */
  async emergencyShutdown(testId: string): Promise<void> {
    const instance = await this.getJudge0Instance(testId);
    if (!instance) {
      throw new Error(`No instance found for test ${testId}`);
    }

    await this.initiateShutdown({
      testId,
      instanceId: instance.instanceId,
      reason: 'EMERGENCY',
      forceShutdown: true
    });
  }

  /**
   * Helper methods
   */
  private async getJudge0Instance(testId: string) {
    return await prisma.judge0Instance.findUnique({
      where: { testId }
    });
  }

  private async updateInstanceStatus(testId: string, status: any) {
    await prisma.judge0Instance.update({
      where: { testId },
      data: { status }
    });
  }

  private hasMinimumWaitTimePassed(createdAt: Date): boolean {
    const minWaitTime = 5 * 60 * 1000; // 5 minutes minimum
    return Date.now() - createdAt.getTime() > minWaitTime;
  }

  private estimateTimeRemaining(submissions: any[]): number {
    const pendingSubmissions = submissions.filter((s: any) => s.status === 'PENDING');
    return pendingSubmissions.length * 30; // Estimate 30 seconds per submission
  }

  private async waitForPendingSubmissions(testId: string, maxWaitMinutes = 10): Promise<void> {
    console.log(`Waiting for pending submissions for test ${testId}`);
    
    const maxWaitTime = maxWaitMinutes * 60 * 1000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const pendingCount = await prisma.testSubmission.count({
        where: {
          session: { testId },
          status: 'PENDING'
        }
      });

      if (pendingCount === 0) {
        console.log(`All submissions completed for test ${testId}`);
        return;
      }

      console.log(`Waiting for ${pendingCount} pending submissions...`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    }

    console.log(`Max wait time reached for test ${testId}, proceeding with shutdown`);
  }

  private async storeShutdownMetrics(testId: string, metrics: any): Promise<void> {
    await prisma.judge0Instance.update({
      where: { testId },
      data: {
        shutdownReason: metrics.reason,
        finalCost: metrics.finalCost,
        shutdownAt: metrics.shutdownTime
      }
    });
  }
} 