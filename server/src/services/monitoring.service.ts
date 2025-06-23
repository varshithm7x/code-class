import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// System metrics interface - KISS principle
export interface SystemMetrics {
  multiTestUsage: {
    totalExecutions: number;
    efficiencyGains: number[];
    apiCallsSaved: number;
    averageTestCasesPerSubmission: number;
  };
  performance: {
    averageExecutionTime: number;
    successRate: number;
    errorRate: number;
    uptimePercentage: number;
  };
  userAdoption: {
    activeUsers: number;
    multiTestUsers: number;
    featureUsageRate: number;
    newUserOnboarding: number;
  };
}

// Simple metrics collection without over-engineering
export class MonitoringService {
  private static instance: MonitoringService;
  private metrics: SystemMetrics;
  private lastUpdated: Date;

  private constructor() {
    this.metrics = this.initializeMetrics();
    this.lastUpdated = new Date();
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  private initializeMetrics(): SystemMetrics {
    return {
      multiTestUsage: {
        totalExecutions: 0,
        efficiencyGains: [],
        apiCallsSaved: 0,
        averageTestCasesPerSubmission: 0,
      },
      performance: {
        averageExecutionTime: 0,
        successRate: 100,
        errorRate: 0,
        uptimePercentage: 99.9,
      },
      userAdoption: {
        activeUsers: 0,
        multiTestUsers: 0,
        featureUsageRate: 0,
        newUserOnboarding: 0,
      },
    };
  }

  // Track multi-test execution
  public async trackMultiTestExecution(data: {
    userId: string;
    testCaseCount: number;
    executionTime: number;
    success: boolean;
    apiCallsSaved: number;
    efficiencyGain: number;
  }): Promise<void> {
    try {
      // Update in-memory metrics
      this.metrics.multiTestUsage.totalExecutions++;
      this.metrics.multiTestUsage.apiCallsSaved += data.apiCallsSaved;
      this.metrics.multiTestUsage.efficiencyGains.push(data.efficiencyGain);

      // Calculate running averages
      const avgTestCases = 
        (this.metrics.multiTestUsage.averageTestCasesPerSubmission * 
         (this.metrics.multiTestUsage.totalExecutions - 1) + data.testCaseCount) /
        this.metrics.multiTestUsage.totalExecutions;
      
      this.metrics.multiTestUsage.averageTestCasesPerSubmission = avgTestCases;

      // Update performance metrics
      const avgExecTime = 
        (this.metrics.performance.averageExecutionTime * 
         (this.metrics.multiTestUsage.totalExecutions - 1) + data.executionTime) /
        this.metrics.multiTestUsage.totalExecutions;
      
      this.metrics.performance.averageExecutionTime = avgExecTime;

      // Update success/error rates
      const totalExecutions = this.metrics.multiTestUsage.totalExecutions;
      const currentErrors = Math.round(this.metrics.performance.errorRate * (totalExecutions - 1) / 100);
      const newErrors = data.success ? 0 : 1;
      
      this.metrics.performance.errorRate = ((currentErrors + newErrors) / totalExecutions) * 100;
      this.metrics.performance.successRate = 100 - this.metrics.performance.errorRate;

      // Simple logging for debugging
      console.log(`[Monitoring] Multi-test execution tracked: ${data.testCaseCount} test cases, ${data.efficiencyGain}x efficiency`);

    } catch (error) {
      console.error('[Monitoring] Error tracking multi-test execution:', error);
    }
  }

  // Track user adoption
  public async trackUserAdoption(): Promise<void> {
    try {
      // Get active users from database (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const activeUsers = await prisma.user.count({
        where: {
          updatedAt: {
            gte: thirtyDaysAgo,
          },
        },
      });

      // Count users who have used multi-test features
      // This is a simplified approach - in production you'd track this more precisely
      const multiTestUsers = Math.round(activeUsers * 0.3); // Placeholder until we track actual usage

      this.metrics.userAdoption.activeUsers = activeUsers;
      this.metrics.userAdoption.multiTestUsers = multiTestUsers;
      this.metrics.userAdoption.featureUsageRate = 
        activeUsers > 0 ? (multiTestUsers / activeUsers) * 100 : 0;

      console.log(`[Monitoring] User adoption updated: ${activeUsers} active, ${multiTestUsers} using multi-test`);

    } catch (error) {
      console.error('[Monitoring] Error tracking user adoption:', error);
    }
  }

  // Get current metrics
  public getMetrics(): SystemMetrics {
    return { ...this.metrics };
  }

  // Get formatted efficiency summary
  public getEfficiencySummary(): {
    totalApiCallsSaved: number;
    averageEfficiencyGain: number;
    totalExecutions: number;
    successRate: number;
  } {
    const gains = this.metrics.multiTestUsage.efficiencyGains;
    const averageGain = gains.length > 0 
      ? gains.reduce((sum, gain) => sum + gain, 0) / gains.length 
      : 0;

    return {
      totalApiCallsSaved: this.metrics.multiTestUsage.apiCallsSaved,
      averageEfficiencyGain: Math.round(averageGain * 10) / 10,
      totalExecutions: this.metrics.multiTestUsage.totalExecutions,
      successRate: Math.round(this.metrics.performance.successRate * 10) / 10,
    };
  }

  // Simple health check
  public getSystemHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    metrics: {
      errorRate: number;
      averageResponseTime: number;
      uptime: number;
    };
    message: string;
  } {
    const errorRate = this.metrics.performance.errorRate;
    const responseTime = this.metrics.performance.averageExecutionTime;
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    let message = 'System operating normally';

    if (errorRate > 5) {
      status = 'critical';
      message = 'High error rate detected';
    } else if (errorRate > 2 || responseTime > 1000) {
      status = 'warning';
      message = 'Performance degradation detected';
    }

    return {
      status,
      metrics: {
        errorRate: Math.round(errorRate * 10) / 10,
        averageResponseTime: Math.round(responseTime),
        uptime: this.metrics.performance.uptimePercentage,
      },
      message,
    };
  }

  // Reset metrics (for testing or maintenance)
  public resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    this.lastUpdated = new Date();
    console.log('[Monitoring] Metrics reset');
  }

  // Get last updated timestamp
  public getLastUpdated(): Date {
    return this.lastUpdated;
  }
}

// Export singleton instance
export const monitoringService = MonitoringService.getInstance(); 