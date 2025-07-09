import { PrismaClient } from '@prisma/client';
import { TestCostReport } from './cost-tracking.service';

const prisma = new PrismaClient();

export interface NotificationConfig {
  email?: string;
  webhook?: string;
  slack?: string;
  enableCostAlerts: boolean;
  enableFailureAlerts: boolean;
  enableCompletionNotifications: boolean;
}

export interface TestEvent {
  testId: string;
  eventType: 'LAUNCHED' | 'READY' | 'COMPLETED' | 'FAILED' | 'SHUTDOWN' | 'COST_ALERT';
  timestamp: Date;
  details: any;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
}

export class AdminNotificationService {
  private notificationConfig: NotificationConfig;

  constructor(config: NotificationConfig = {
    enableCostAlerts: true,
    enableFailureAlerts: true,
    enableCompletionNotifications: true
  }) {
    this.notificationConfig = config;
  }

  /**
   * Notify test launch
   */
  async notifyTestLaunched(testId: string, instanceId: string, estimatedCost: number): Promise<void> {
    const event: TestEvent = {
      testId,
      eventType: 'LAUNCHED',
      timestamp: new Date(),
      details: {
        instanceId,
        estimatedCost,
        message: `Judge0 instance launched for test ${testId}`
      },
      severity: 'INFO'
    };

    await this.sendNotification(event);
    await this.logEvent(event);
  }

  /**
   * Notify test ready
   */
  async notifyTestReady(testId: string, judgeUrl: string, setupTime: number): Promise<void> {
    const event: TestEvent = {
      testId,
      eventType: 'READY',
      timestamp: new Date(),
      details: {
        judgeUrl,
        setupTime,
        message: `Test ${testId} is ready for students (setup took ${setupTime}s)`
      },
      severity: 'INFO'
    };

    await this.sendNotification(event);
    await this.logEvent(event);
  }

  /**
   * Notify test completion with cost report
   */
  async notifyTestCompleted(testId: string, costReport: TestCostReport): Promise<void> {
    if (!this.notificationConfig.enableCompletionNotifications) return;

    const event: TestEvent = {
      testId,
      eventType: 'COMPLETED',
      timestamp: new Date(),
      details: {
        costReport,
        message: `Test ${testId} completed successfully`,
        summary: {
          duration: `${costReport.duration} minutes`,
          totalCost: `$${costReport.costs.total}`,
          studentsServed: costReport.metrics.studentsServed,
          costPerStudent: `$${costReport.efficiency.costPerStudent}`
        }
      },
      severity: 'INFO'
    };

    await this.sendNotification(event);
    await this.logEvent(event);
  }

  /**
   * Notify test failure
   */
  async notifyTestFailure(testId: string, error: any, instanceId?: string): Promise<void> {
    if (!this.notificationConfig.enableFailureAlerts) return;

    const event: TestEvent = {
      testId,
      eventType: 'FAILED',
      timestamp: new Date(),
      details: {
        error: error.message || error,
        instanceId,
        message: `Test ${testId} failed`,
        actionRequired: 'Manual intervention may be required'
      },
      severity: 'ERROR'
    };

    await this.sendNotification(event);
    await this.logEvent(event);
  }

  /**
   * Notify cost alert
   */
  async notifyCostAlert(testId: string, currentCost: number, threshold: number): Promise<void> {
    if (!this.notificationConfig.enableCostAlerts) return;

    const event: TestEvent = {
      testId,
      eventType: 'COST_ALERT',
      timestamp: new Date(),
      details: {
        currentCost,
        threshold,
        message: `Cost alert: Test ${testId} has exceeded threshold`,
        recommendation: 'Consider manual shutdown if test is running longer than expected'
      },
      severity: 'WARNING'
    };

    await this.sendNotification(event);
    await this.logEvent(event);
  }

  /**
   * Notify shutdown
   */
  async notifyShutdown(testId: string, reason: string, finalCost: number): Promise<void> {
    const event: TestEvent = {
      testId,
      eventType: 'SHUTDOWN',
      timestamp: new Date(),
      details: {
        reason,
        finalCost,
        message: `Test ${testId} has been shut down`,
        shutdownReason: reason
      },
      severity: reason === 'EMERGENCY' ? 'CRITICAL' : 'INFO'
    };

    await this.sendNotification(event);
    await this.logEvent(event);
  }

  /**
   * Send daily cost summary
   */
  async sendDailyCostSummary(): Promise<void> {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const dailyTests = await prisma.judge0Instance.findMany({
      where: {
        createdAt: {
          gte: yesterday,
          lt: today
        },
        status: 'TERMINATED'
      }
    });

    if (dailyTests.length === 0) return;

    const totalCost = dailyTests.reduce((sum, test) => sum + (test.finalCost || 0), 0);
    const avgCost = totalCost / dailyTests.length;

    const summary = {
      date: yesterday.toISOString().split('T')[0],
      testsRun: dailyTests.length,
      totalCost: Math.round(totalCost * 100) / 100,
      averageCost: Math.round(avgCost * 100) / 100,
      estimatedMonthlyCost: Math.round(totalCost * 30 * 100) / 100
    };

    const event: TestEvent = {
      testId: 'DAILY_SUMMARY',
      eventType: 'COMPLETED',
      timestamp: new Date(),
      details: {
        summary,
        message: `Daily cost summary for ${summary.date}`,
        breakdown: dailyTests.map(test => ({
          testId: test.testId,
          cost: test.finalCost,
          duration: 'N/A' // Could calculate if needed
        }))
      },
      severity: 'INFO'
    };

    await this.sendNotification(event);
  }

  /**
   * Send notification based on configured channels
   */
  private async sendNotification(event: TestEvent): Promise<void> {
    try {
      // Email notification
      if (this.notificationConfig.email) {
        await this.sendEmailNotification(event);
      }

      // Webhook notification
      if (this.notificationConfig.webhook) {
        await this.sendWebhookNotification(event);
      }

      // Slack notification
      if (this.notificationConfig.slack) {
        await this.sendSlackNotification(event);
      }

      // Console log for development
      console.log(`[${event.severity}] ${event.eventType}: ${event.details.message}`);

    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  /**
   * Email notification (placeholder - would integrate with actual email service)
   */
  private async sendEmailNotification(event: TestEvent): Promise<void> {
    // Placeholder for email integration (SendGrid, SES, etc.)
    console.log(`EMAIL: ${event.eventType} - ${event.details.message}`);
  }

  /**
   * Webhook notification
   */
  private async sendWebhookNotification(event: TestEvent): Promise<void> {
    // Placeholder for webhook integration
    console.log(`WEBHOOK: ${event.eventType} - ${JSON.stringify(event.details)}`);
  }

  /**
   * Slack notification
   */
  private async sendSlackNotification(event: TestEvent): Promise<void> {
    // Placeholder for Slack integration
    const color = this.getSeverityColor(event.severity);
    console.log(`SLACK: [${color}] ${event.eventType} - ${event.details.message}`);
  }

  /**
   * Log event to database
   */
  private async logEvent(event: TestEvent): Promise<void> {
    try {
      await prisma.notificationLog.create({
        data: {
          testId: event.testId,
          eventType: event.eventType,
          severity: event.severity,
          message: event.details.message,
          details: JSON.stringify(event.details),
          timestamp: event.timestamp
        }
      });
    } catch (error) {
      console.error('Failed to log notification event:', error);
    }
  }

  /**
   * Get color for severity level
   */
  private getSeverityColor(severity: string): string {
    const colors = {
      'INFO': '#36a64f',      // Green
      'WARNING': '#ff9500',   // Orange
      'ERROR': '#ff0000',     // Red
      'CRITICAL': '#8B0000'   // Dark Red
    };
    return colors[severity as keyof typeof colors] || '#000000';
  }

  /**
   * Get notification history for a test
   */
  async getNotificationHistory(testId: string): Promise<TestEvent[]> {
    const logs = await prisma.notificationLog.findMany({
      where: { testId },
      orderBy: { timestamp: 'desc' }
    });

    return logs.map(log => ({
      testId: log.testId,
      eventType: log.eventType as any,
      timestamp: log.timestamp,
      details: JSON.parse(log.details || '{}'),
      severity: log.severity as any
    }));
  }

  /**
   * Update notification configuration
   */
  updateConfig(config: Partial<NotificationConfig>): void {
    this.notificationConfig = { ...this.notificationConfig, ...config };
  }
} 