import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TestCostReport {
  testId: string;
  duration: number; // minutes
  costs: {
    compute: number;
    storage: number;
    dataTransfer: number;
    total: number;
  };
  metrics: {
    studentsServed: number;
    submissionsProcessed: number;
    testCasesExecuted: number;
  };
  efficiency: {
    costPerStudent: number;
    costPerSubmission: number;
    costPerTestCase: number;
  };
}

export interface CostBreakdown {
  instanceType: string;
  hourlyRate: number;
  durationHours: number;
  computeCost: number;
  storageCost: number;
  dataTransferCost: number;
  totalCost: number;
}

export class CostTrackingService {

  /**
   * Calculate final cost for a completed test
   */
  async calculateFinalCost(testId: string): Promise<number> {
    const instance = await this.getJudge0Instance(testId);
    if (!instance) {
      throw new Error(`No instance found for test ${testId}`);
    }

    const launchTime = instance.createdAt;
    const shutdownTime = new Date();
    const durationHours = (shutdownTime.getTime() - launchTime.getTime()) / (1000 * 60 * 60);

    const breakdown = this.calculateCostBreakdown(
      durationHours,
      instance.instanceType || 't3.medium'
    );

    return breakdown.totalCost;
  }

  /**
   * Generate comprehensive cost report for a test
   */
  async generateCostReport(testId: string): Promise<TestCostReport> {
    const instance = await this.getJudge0Instance(testId);
    if (!instance) {
      throw new Error(`No instance found for test ${testId}`);
    }

    const submissions = await prisma.testSubmission.count({
      where: { session: { testId } }
    });

    const testCases = await this.countTotalTestCases(testId);
    
    const launchTime = instance.createdAt;
    const endTime = instance.shutdownAt || new Date();
    const durationMinutes = (endTime.getTime() - launchTime.getTime()) / (1000 * 60);
    const durationHours = durationMinutes / 60;

    const breakdown = this.calculateCostBreakdown(durationHours, instance.instanceType || 't3.medium');

    const costs = {
      compute: breakdown.computeCost,
      storage: breakdown.storageCost,
      dataTransfer: breakdown.dataTransferCost,
      total: breakdown.totalCost
    };

    const metrics = {
      studentsServed: instance.studentsServed,
      submissionsProcessed: submissions,
      testCasesExecuted: testCases
    };

    const efficiency = {
      costPerStudent: costs.total / Math.max(metrics.studentsServed, 1),
      costPerSubmission: costs.total / Math.max(metrics.submissionsProcessed, 1),
      costPerTestCase: costs.total / Math.max(metrics.testCasesExecuted, 1)
    };

    return {
      testId,
      duration: Math.round(durationMinutes),
      costs,
      metrics,
      efficiency: {
        costPerStudent: Math.round(efficiency.costPerStudent * 100) / 100,
        costPerSubmission: Math.round(efficiency.costPerSubmission * 100) / 100,
        costPerTestCase: Math.round(efficiency.costPerTestCase * 1000) / 1000
      }
    };
  }

  /**
   * Calculate detailed cost breakdown
   */
  private calculateCostBreakdown(durationHours: number, instanceType: string): CostBreakdown {
    const hourlyRates = {
      't3.micro': 0.0104,
      't3.small': 0.0208,
      't3.medium': 0.0416,
      't3.large': 0.0832,
      't3.xlarge': 0.1664
    };

    const hourlyRate = hourlyRates[instanceType as keyof typeof hourlyRates] || hourlyRates['t3.medium'];
    const computeCost = durationHours * hourlyRate;

    // Storage cost (30GB EBS GP3)
    const storageGB = 30;
    const storageMonthlyRate = 0.10; // $0.10/GB/month
    const storageCost = (storageGB * storageMonthlyRate * durationHours) / (30 * 24); // Prorated

    // Data transfer cost (estimated)
    const estimatedDataGB = Math.min(durationHours * 0.1, 1); // Cap at 1GB
    const dataTransferCost = Math.max(0, (estimatedDataGB - 1) * 0.09); // First 1GB free

    const totalCost = computeCost + storageCost + dataTransferCost;

    return {
      instanceType,
      hourlyRate,
      durationHours: Math.round(durationHours * 100) / 100,
      computeCost: Math.round(computeCost * 100) / 100,
      storageCost: Math.round(storageCost * 100) / 100,
      dataTransferCost: Math.round(dataTransferCost * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100
    };
  }

  /**
   * Get real-time cost for a running test
   */
  async getRealTimeCost(testId: string): Promise<{ currentCost: number; projectedCost: number }> {
    const instance = await this.getJudge0Instance(testId);
    if (!instance || instance.status === 'TERMINATED') {
      return { currentCost: 0, projectedCost: 0 };
    }

    const launchTime = instance.createdAt;
    const now = new Date();
    const currentDurationHours = (now.getTime() - launchTime.getTime()) / (1000 * 60 * 60);

    const breakdown = this.calculateCostBreakdown(currentDurationHours, instance.instanceType || 't3.medium');
    const currentCost = breakdown.totalCost;

    // Project cost for expected test duration (3 hours default)
    const expectedDurationHours = 3;
    const projectedBreakdown = this.calculateCostBreakdown(expectedDurationHours, instance.instanceType || 't3.medium');
    const projectedCost = projectedBreakdown.totalCost;

    return {
      currentCost: Math.round(currentCost * 100) / 100,
      projectedCost: Math.round(projectedCost * 100) / 100
    };
  }

  /**
   * Get cost summary for multiple tests
   */
  async getCostSummary(timeframe: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<{
    totalCost: number;
    testsRun: number;
    averageCost: number;
    costBreakdown: {
      compute: number;
      storage: number;
      dataTransfer: number;
    };
  }> {
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case 'daily':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const instances = await prisma.judge0Instance.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: now
        },
        status: 'TERMINATED'
      }
    });

    let totalCost = 0;
    let totalCompute = 0;
    let totalStorage = 0;
    let totalDataTransfer = 0;

    for (const instance of instances) {
      const durationHours = instance.shutdownAt 
        ? (instance.shutdownAt.getTime() - instance.createdAt.getTime()) / (1000 * 60 * 60)
        : 0;
      
      const breakdown = this.calculateCostBreakdown(durationHours, instance.instanceType || 't3.medium');
      
      totalCost += breakdown.totalCost;
      totalCompute += breakdown.computeCost;
      totalStorage += breakdown.storageCost;
      totalDataTransfer += breakdown.dataTransferCost;
    }

    return {
      totalCost: Math.round(totalCost * 100) / 100,
      testsRun: instances.length,
      averageCost: instances.length > 0 ? Math.round((totalCost / instances.length) * 100) / 100 : 0,
      costBreakdown: {
        compute: Math.round(totalCompute * 100) / 100,
        storage: Math.round(totalStorage * 100) / 100,
        dataTransfer: Math.round(totalDataTransfer * 100) / 100
      }
    };
  }

  /**
   * Helper methods
   */
  private async getJudge0Instance(testId: string) {
    return await prisma.judge0Instance.findUnique({
      where: { testId }
    });
  }

  private async countTotalTestCases(testId: string): Promise<number> {
    // This would depend on your test case structure
    // For now, estimate based on submissions
    const submissions = await prisma.testSubmission.count({
      where: { session: { testId } }
    });
    
    // Assume average of 50 test cases per submission
    return submissions * 50;
  }
} 