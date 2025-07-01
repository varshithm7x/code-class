import { Request, Response } from 'express';
import { FailureRecoveryService } from '../../services/failure-recovery.service';
import { ErrorHandlingService } from '../../services/error-handling.service';
import { ResilienceMonitoringService } from '../../services/resilience-monitoring.service';

export class Phase5ResilienceController {
  private failureRecovery = new FailureRecoveryService();
  private errorHandler = new ErrorHandlingService();
  private resilienceMonitor = new ResilienceMonitoringService();

  /**
   * Get health check for a test instance
   */
  async getHealthCheck(req: Request, res: Response) {
    try {
      const { testId } = req.params;
      
      const health = await this.failureRecovery.performHealthCheck(testId);
      
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

  /**
   * Start health monitoring for a test
   */
  async startHealthMonitoring(req: Request, res: Response) {
    try {
      const { testId } = req.params;
      
      await this.failureRecovery.startHealthMonitoring(testId);
      
      res.json({
        success: true,
        message: `Health monitoring started for test ${testId}`
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Stop health monitoring for a test
   */
  async stopHealthMonitoring(req: Request, res: Response) {
    try {
      const { testId } = req.params;
      
      this.failureRecovery.stopHealthMonitoring(testId);
      
      res.json({
        success: true,
        message: `Health monitoring stopped for test ${testId}`
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Trigger manual recovery for a test
   */
  async triggerRecovery(req: Request, res: Response) {
    try {
      const { testId } = req.params;
      const { instanceId, failureType } = req.body;
      
      await this.failureRecovery.handleInstanceFailure(testId, instanceId, failureType);
      
      res.json({
        success: true,
        message: `Recovery initiated for test ${testId}`
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get error statistics
   */
  async getErrorStats(req: Request, res: Response) {
    try {
      const errorStats = this.errorHandler.getErrorStats();
      const circuitBreakerStates = this.errorHandler.getCircuitBreakerStates();
      
      res.json({
        success: true,
        data: {
          errorStats,
          circuitBreakerStates
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Reset error statistics
   */
  async resetErrorStats(req: Request, res: Response) {
    try {
      this.errorHandler.resetErrorStats();
      
      res.json({
        success: true,
        message: 'Error statistics reset'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Reset circuit breaker
   */
  async resetCircuitBreaker(req: Request, res: Response) {
    try {
      const { operationName } = req.params;
      
      this.errorHandler.resetCircuitBreaker(operationName);
      
      res.json({
        success: true,
        message: `Circuit breaker reset for ${operationName}`
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get resilience metrics
   */
  async getResilienceMetrics(req: Request, res: Response) {
    try {
      const metrics = await this.resilienceMonitor.getResilienceMetrics();
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get system alerts
   */
  async getSystemAlerts(req: Request, res: Response) {
    try {
      const alerts = this.resilienceMonitor.getSystemAlerts();
      
      res.json({
        success: true,
        data: alerts
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Resolve system alert
   */
  async resolveAlert(req: Request, res: Response) {
    try {
      const { alertId } = req.params;
      const { resolution } = req.body;
      
      this.resilienceMonitor.resolveAlert(alertId, resolution);
      
      res.json({
        success: true,
        message: `Alert ${alertId} resolved`
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get resilience trends
   */
  async getResilienceTrends(req: Request, res: Response) {
    try {
      const trends = this.resilienceMonitor.getResilienceTrends();
      
      res.json({
        success: true,
        data: trends
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Generate resilience report
   */
  async generateResilienceReport(req: Request, res: Response) {
    try {
      const report = await this.resilienceMonitor.generateResilienceReport();
      
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
   * Start resilience monitoring
   */
  async startResilienceMonitoring(req: Request, res: Response) {
    try {
      await this.resilienceMonitor.startResilienceMonitoring();
      
      res.json({
        success: true,
        message: 'Resilience monitoring started'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get Phase 5 system status
   */
  async getSystemStatus(req: Request, res: Response) {
    try {
      const errorStats = this.errorHandler.getErrorStats();
      const circuitBreakerStates = this.errorHandler.getCircuitBreakerStates();
      const alerts = this.resilienceMonitor.getSystemAlerts();
      const metrics = await this.resilienceMonitor.getResilienceMetrics();
      
      const status = {
        phase5Services: {
          failureRecovery: 'ACTIVE',
          errorHandling: 'ACTIVE', 
          resilienceMonitoring: 'ACTIVE'
        },
        systemHealth: {
          uptime: metrics.systemHealth.uptime,
          errorRate: metrics.systemHealth.errorRate,
          recoveryRate: metrics.recovery.automaticRecoveryRate
        },
        activeIssues: {
          unresolvedAlerts: alerts.filter(a => !a.resolved).length,
          circuitBreakersOpen: Object.values(circuitBreakerStates).filter((cb: any) => cb.isOpen).length,
          totalErrors: Object.values(errorStats).reduce((sum, count) => sum + count, 0)
        }
      };
      
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
} 