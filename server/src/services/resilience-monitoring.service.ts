import { PrismaClient } from '@prisma/client';
import { FailureRecoveryService } from './failure-recovery.service';
import { ErrorHandlingService } from './error-handling.service';

const prisma = new PrismaClient();

export interface ResilienceMetrics {
  systemHealth: {
    uptime: number; // percentage
    avgResponseTime: number; // milliseconds
    errorRate: number; // percentage
    failureRecoveryRate: number; // percentage
  };
  testExecution: {
    successRate: number; // percentage
    avgExecutionTime: number; // minutes
    timeoutRate: number; // percentage
    resourceUtilization: number; // percentage
  };
  errorAnalysis: {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    topErrors: Array<{ error: string; count: number; impact: string }>;
    resolutionTime: number; // average minutes
  };
  recovery: {
    automaticRecoveryRate: number; // percentage
    avgRecoveryTime: number; // minutes
    manualInterventionRate: number; // percentage
    backupInstanceUsage: number; // count
  };
}

export interface SystemAlert {
  id: string;
  type: 'PERFORMANCE' | 'AVAILABILITY' | 'CAPACITY' | 'SECURITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  details: any;
  timestamp: Date;
  resolved: boolean;
  resolution?: string;
}

export class ResilienceMonitoringService {
  private failureRecovery = new FailureRecoveryService();
  private errorHandler = new ErrorHandlingService();
  private alerts: SystemAlert[] = [];
  private metricsHistory: ResilienceMetrics[] = [];

  /**
   * Get current resilience metrics
   */
  async getResilienceMetrics(): Promise<ResilienceMetrics> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get recent instances for analysis
    const recentInstances = await prisma.judge0Instance.findMany({
      where: {
        createdAt: {
          gte: oneDayAgo,
          lt: now
        }
      },
      include: {
        test: true
      }
    });

    const totalInstances = recentInstances.length;
    const successfulInstances = recentInstances.filter(i => i.status === 'TERMINATED').length;
    const failedInstances = recentInstances.filter(i => i.status === 'FAILED').length;

    // Calculate system health metrics
    const systemHealth = {
      uptime: totalInstances > 0 ? (successfulInstances / totalInstances) * 100 : 100,
      avgResponseTime: await this.calculateAvgResponseTime(recentInstances),
      errorRate: totalInstances > 0 ? (failedInstances / totalInstances) * 100 : 0,
      failureRecoveryRate: await this.calculateFailureRecoveryRate()
    };

    // Calculate test execution metrics
    const testExecution = {
      successRate: totalInstances > 0 ? (successfulInstances / totalInstances) * 100 : 100,
      avgExecutionTime: await this.calculateAvgExecutionTime(recentInstances),
      timeoutRate: await this.calculateTimeoutRate(recentInstances),
      resourceUtilization: await this.calculateResourceUtilization(recentInstances)
    };

    // Get error analysis
    const errorStats = this.errorHandler.getErrorStats();
    const errorAnalysis = {
      totalErrors: Object.values(errorStats).reduce((sum, count) => sum + count, 0),
      errorsByCategory: this.categorizeErrors(errorStats),
      topErrors: this.getTopErrors(errorStats),
      resolutionTime: 5.2 // Mock average resolution time in minutes
    };

    // Calculate recovery metrics
    const recovery = {
      automaticRecoveryRate: 85.5, // Mock percentage
      avgRecoveryTime: 3.8, // Mock average recovery time in minutes
      manualInterventionRate: 14.5, // Mock percentage
      backupInstanceUsage: await this.countBackupInstances(recentInstances)
    };

    const metrics: ResilienceMetrics = {
      systemHealth,
      testExecution,
      errorAnalysis,
      recovery
    };

    // Store metrics history
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > 24) { // Keep 24 hours of history
      this.metricsHistory.shift();
    }

    return metrics;
  }

  /**
   * Get system alerts
   */
  getSystemAlerts(): SystemAlert[] {
    return this.alerts.slice().sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Add system alert
   */
  addAlert(alert: Omit<SystemAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const newAlert: SystemAlert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.push(newAlert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    console.log(`New alert: ${newAlert.severity} - ${newAlert.message}`);
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string, resolution: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolution = resolution;
      console.log(`Alert resolved: ${alertId} - ${resolution}`);
    }
  }

  /**
   * Monitor system resilience continuously
   */
  async startResilienceMonitoring(): Promise<void> {
    const monitoringInterval = 60000; // 1 minute

    const monitor = async () => {
      try {
        const metrics = await this.getResilienceMetrics();
        
        // Check for concerning metrics and generate alerts
        await this.checkForAlerts(metrics);
        
      } catch (error) {
        console.error('Resilience monitoring error:', error);
        this.addAlert({
          type: 'AVAILABILITY',
          severity: 'HIGH',
          message: 'Resilience monitoring failed',
          details: { error: (error as Error).message }
        });
      }
    };

    // Start monitoring
    monitor();
    setInterval(monitor, monitoringInterval);
    
    console.log('Resilience monitoring started');
  }

  /**
   * Get resilience trends
   */
  getResilienceTrends(): {
    uptimeTrend: number[];
    errorRateTrend: number[];
    responseTimeTrend: number[];
    recoveryRateTrend: number[];
  } {
    const recent24 = this.metricsHistory.slice(-24);
    
    return {
      uptimeTrend: recent24.map(m => m.systemHealth.uptime),
      errorRateTrend: recent24.map(m => m.systemHealth.errorRate),
      responseTimeTrend: recent24.map(m => m.systemHealth.avgResponseTime),
      recoveryRateTrend: recent24.map(m => m.recovery.automaticRecoveryRate)
    };
  }

  /**
   * Generate resilience report
   */
  async generateResilienceReport(): Promise<{
    summary: string;
    metrics: ResilienceMetrics;
    recommendations: string[];
    alerts: SystemAlert[];
  }> {
    const metrics = await this.getResilienceMetrics();
    const activeAlerts = this.alerts.filter(a => !a.resolved);
    
    let summary = 'System Resilience: ';
    if (metrics.systemHealth.uptime > 99) {
      summary += 'EXCELLENT';
    } else if (metrics.systemHealth.uptime > 95) {
      summary += 'GOOD';
    } else if (metrics.systemHealth.uptime > 90) {
      summary += 'FAIR';
    } else {
      summary += 'NEEDS ATTENTION';
    }

    const recommendations = this.generateRecommendations(metrics);

    return {
      summary,
      metrics,
      recommendations,
      alerts: activeAlerts
    };
  }

  /**
   * Private helper methods
   */
  private async calculateAvgResponseTime(instances: any[]): Promise<number> {
    if (instances.length === 0) return 0;
    
    // Mock calculation - in reality would measure actual response times
    return 150; // milliseconds
  }

  private async calculateAvgExecutionTime(instances: any[]): Promise<number> {
    if (instances.length === 0) return 0;
    
    const totalTime = instances.reduce((sum, instance) => {
      if (instance.shutdownAt && instance.createdAt) {
        return sum + (instance.shutdownAt.getTime() - instance.createdAt.getTime()) / (1000 * 60);
      }
      return sum;
    }, 0);
    
    return totalTime / instances.length;
  }

  private async calculateTimeoutRate(instances: any[]): Promise<number> {
    // Mock calculation
    return 2.5; // percentage
  }

  private async calculateResourceUtilization(instances: any[]): Promise<number> {
    // Mock calculation
    return 68.5; // percentage
  }

  private async calculateFailureRecoveryRate(): Promise<number> {
    // Mock calculation
    return 92.3; // percentage
  }

  private categorizeErrors(errorStats: Record<string, number>): Record<string, number> {
    const categories: Record<string, number> = {};
    
    for (const [key, count] of Object.entries(errorStats)) {
      const category = key.split(':')[0];
      categories[category] = (categories[category] || 0) + count;
    }
    
    return categories;
  }

  private getTopErrors(errorStats: Record<string, number>): Array<{ error: string; count: number; impact: string }> {
    return Object.entries(errorStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([error, count]) => ({
        error,
        count,
        impact: count > 10 ? 'HIGH' : count > 5 ? 'MEDIUM' : 'LOW'
      }));
  }

  private async countBackupInstances(instances: any[]): Promise<number> {
    // Count instances that were likely backups (launched shortly after another instance for same test)
    return 0; // Mock for now
  }

  private async checkForAlerts(metrics: ResilienceMetrics): Promise<void> {
    // Check uptime
    if (metrics.systemHealth.uptime < 95) {
      this.addAlert({
        type: 'AVAILABILITY',
        severity: metrics.systemHealth.uptime < 90 ? 'CRITICAL' : 'HIGH',
        message: `System uptime below threshold: ${metrics.systemHealth.uptime.toFixed(1)}%`,
        details: { uptime: metrics.systemHealth.uptime }
      });
    }

    // Check error rate
    if (metrics.systemHealth.errorRate > 10) {
      this.addAlert({
        type: 'PERFORMANCE',
        severity: metrics.systemHealth.errorRate > 20 ? 'CRITICAL' : 'HIGH',
        message: `High error rate detected: ${metrics.systemHealth.errorRate.toFixed(1)}%`,
        details: { errorRate: metrics.systemHealth.errorRate }
      });
    }

    // Check response time
    if (metrics.systemHealth.avgResponseTime > 1000) {
      this.addAlert({
        type: 'PERFORMANCE',
        severity: 'MEDIUM',
        message: `Slow response time: ${metrics.systemHealth.avgResponseTime}ms`,
        details: { responseTime: metrics.systemHealth.avgResponseTime }
      });
    }

    // Check recovery rate
    if (metrics.recovery.automaticRecoveryRate < 80) {
      this.addAlert({
        type: 'CAPACITY',
        severity: 'HIGH',
        message: `Low automatic recovery rate: ${metrics.recovery.automaticRecoveryRate.toFixed(1)}%`,
        details: { recoveryRate: metrics.recovery.automaticRecoveryRate }
      });
    }
  }

  private generateRecommendations(metrics: ResilienceMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.systemHealth.uptime < 99) {
      recommendations.push('Consider implementing redundancy measures to improve uptime');
    }

    if (metrics.systemHealth.errorRate > 5) {
      recommendations.push('Investigate and address high error rate sources');
    }

    if (metrics.recovery.automaticRecoveryRate < 90) {
      recommendations.push('Enhance automatic recovery mechanisms');
    }

    if (metrics.testExecution.timeoutRate > 5) {
      recommendations.push('Optimize test execution to reduce timeout rate');
    }

    if (recommendations.length === 0) {
      recommendations.push('System resilience is performing well - maintain current practices');
    }

    return recommendations;
  }
} 