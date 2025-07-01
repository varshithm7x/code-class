import { Request, Response } from 'express';
import { TestCompletionDetectorService } from '../../services/test-completion-detector.service';
import { CostTrackingService } from '../../services/cost-tracking.service';
import { AdminNotificationService } from '../../services/admin-notification.service';

export class Phase4MonitoringController {
  private completionDetector = new TestCompletionDetectorService();
  private costTracker = new CostTrackingService();
  private notificationService = new AdminNotificationService();

  /**
   * Get test completion status
   */
  async getTestCompletionStatus(req: Request, res: Response) {
    try {
      const { testId } = req.params;
      
      const status = await this.completionDetector.getTestCompletionStatus(testId);
      
      res.json({
        success: true,
        data: status
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Start monitoring test completion
   */
  async startTestMonitoring(req: Request, res: Response) {
    try {
      const { testId } = req.params;
      
      await this.completionDetector.startMonitoring(testId);
      
      res.json({
        success: true,
        message: `Started monitoring test ${testId}`
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Stop monitoring test completion
   */
  async stopTestMonitoring(req: Request, res: Response) {
    try {
      const { testId } = req.params;
      
      this.completionDetector.stopMonitoring(testId);
      
      res.json({
        success: true,
        message: `Stopped monitoring test ${testId}`
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Manual shutdown request
   */
  async requestManualShutdown(req: Request, res: Response) {
    try {
      const { testId } = req.params;
      
      await this.completionDetector.requestManualShutdown(testId);
      
      res.json({
        success: true,
        message: `Manual shutdown initiated for test ${testId}`
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Emergency shutdown
   */
  async emergencyShutdown(req: Request, res: Response) {
    try {
      const { testId } = req.params;
      
      await this.completionDetector.emergencyShutdown(testId);
      
      res.json({
        success: true,
        message: `Emergency shutdown completed for test ${testId}`
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get real-time cost for a test
   */
  async getRealTimeCost(req: Request, res: Response) {
    try {
      const { testId } = req.params;
      
      const cost = await this.costTracker.getRealTimeCost(testId);
      
      res.json({
        success: true,
        data: cost
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Generate cost report for completed test
   */
  async generateCostReport(req: Request, res: Response) {
    try {
      const { testId } = req.params;
      
      const report = await this.costTracker.generateCostReport(testId);
      
      res.json({
        success: true,
        data: report
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get cost summary
   */
  async getCostSummary(req: Request, res: Response) {
    try {
      const { timeframe = 'daily' } = req.query as { timeframe?: 'daily' | 'weekly' | 'monthly' };
      
      const summary = await this.costTracker.getCostSummary(timeframe);
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get notification history for a test
   */
  async getNotificationHistory(req: Request, res: Response) {
    try {
      const { testId } = req.params;
      
      const history = await this.notificationService.getNotificationHistory(testId);
      
      res.json({
        success: true,
        data: history
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update notification configuration
   */
  async updateNotificationConfig(req: Request, res: Response) {
    try {
      const { config } = req.body;
      
      this.notificationService.updateConfig(config);
      
      res.json({
        success: true,
        message: 'Notification configuration updated'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Send daily cost summary
   */
  async sendDailyCostSummary(req: Request, res: Response) {
    try {
      await this.notificationService.sendDailyCostSummary();
      
      res.json({
        success: true,
        message: 'Daily cost summary sent'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get Phase 4 system health
   */
  async getSystemHealth(req: Request, res: Response) {
    try {
      const dailySummary = await this.costTracker.getCostSummary('daily');
      
      const health = {
        phase4Services: {
          testCompletionDetector: 'ACTIVE',
          costTracker: 'ACTIVE',
          notificationService: 'ACTIVE'
        },
        recentActivity: {
          testsCompletedToday: dailySummary.testsRun,
          totalCostToday: dailySummary.totalCost,
          averageCostPerTest: dailySummary.averageCost
        }
      };
      
      res.json({
        success: true,
        data: health
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
} 