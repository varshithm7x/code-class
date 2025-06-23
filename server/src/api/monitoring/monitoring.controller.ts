import { Request, Response } from 'express';
import { monitoringService } from '../../services/monitoring.service';

export class MonitoringController {
  // Get system health status
  static async getSystemHealth(req: Request, res: Response) {
    try {
      const health = monitoringService.getSystemHealth();
      
      res.status(200).json({
        success: true,
        data: health,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Monitoring API] Error getting system health:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get system health',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Get efficiency metrics summary
  static async getEfficiencyMetrics(req: Request, res: Response) {
    try {
      const efficiency = monitoringService.getEfficiencySummary();
      
      res.status(200).json({
        success: true,
        data: {
          ...efficiency,
          description: 'Multi-test system efficiency metrics',
          benefits: {
            apiCallReduction: `${efficiency.totalApiCallsSaved} API calls saved`,
            performanceGain: `${efficiency.averageEfficiencyGain}x average speedup`,
            reliability: `${efficiency.successRate}% success rate`,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Monitoring API] Error getting efficiency metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get efficiency metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Get full system metrics
  static async getSystemMetrics(req: Request, res: Response) {
    try {
      const metrics = monitoringService.getMetrics();
      const lastUpdated = monitoringService.getLastUpdated();
      
      res.status(200).json({
        success: true,
        data: {
          ...metrics,
          metadata: {
            lastUpdated: lastUpdated.toISOString(),
            uptimeHours: Math.round((Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60) * 10) / 10,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Monitoring API] Error getting system metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get system metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Get user adoption statistics
  static async getUserAdoption(req: Request, res: Response) {
    try {
      // Update user adoption metrics before returning
      await monitoringService.trackUserAdoption();
      
      const metrics = monitoringService.getMetrics();
      const adoption = metrics.userAdoption;
      
      res.status(200).json({
        success: true,
        data: {
          ...adoption,
          insights: {
            adoptionRate: `${Math.round(adoption.featureUsageRate)}% of users use multi-test`,
            userGrowth: adoption.newUserOnboarding > 0 ? 'positive' : 'stable',
            engagement: adoption.multiTestUsers > 10 ? 'high' : 'growing',
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Monitoring API] Error getting user adoption:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user adoption metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Dashboard summary - essential metrics for quick overview
  static async getDashboardSummary(req: Request, res: Response) {
    try {
      const health = monitoringService.getSystemHealth();
      const efficiency = monitoringService.getEfficiencySummary();
      const metrics = monitoringService.getMetrics();
      
      const summary = {
        systemStatus: health.status,
        totalExecutions: efficiency.totalExecutions,
        apiCallsSaved: efficiency.totalApiCallsSaved,
        averageEfficiency: efficiency.averageEfficiencyGain,
        successRate: efficiency.successRate,
        activeUsers: metrics.userAdoption.activeUsers,
        multiTestUsers: metrics.userAdoption.multiTestUsers,
        featureAdoption: Math.round(metrics.userAdoption.featureUsageRate),
        lastUpdated: monitoringService.getLastUpdated().toISOString(),
      };

      res.status(200).json({
        success: true,
        data: summary,
        message: 'Multi-test system dashboard summary',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Monitoring API] Error getting dashboard summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get dashboard summary',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Reset metrics (admin only - for testing/maintenance)
  static async resetMetrics(req: Request, res: Response) {
    try {
      // In production, add proper admin authentication here
      monitoringService.resetMetrics();
      
      res.status(200).json({
        success: true,
        message: 'Metrics reset successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Monitoring API] Error resetting metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
} 