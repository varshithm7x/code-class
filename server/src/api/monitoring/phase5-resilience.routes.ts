import { Router } from 'express';
import { Phase5ResilienceController } from './phase5-resilience.controller';

const router = Router();
const controller = new Phase5ResilienceController();

// Health Monitoring Routes
router.get('/test/:testId/health', (req, res) => controller.getHealthCheck(req, res));
router.post('/test/:testId/health/start', (req, res) => controller.startHealthMonitoring(req, res));
router.post('/test/:testId/health/stop', (req, res) => controller.stopHealthMonitoring(req, res));

// Failure Recovery Routes
router.post('/test/:testId/recover', (req, res) => controller.triggerRecovery(req, res));

// Error Handling Routes
router.get('/errors/stats', (req, res) => controller.getErrorStats(req, res));
router.post('/errors/reset', (req, res) => controller.resetErrorStats(req, res));
router.post('/circuit-breaker/:operationName/reset', (req, res) => controller.resetCircuitBreaker(req, res));

// Resilience Monitoring Routes
router.get('/resilience/metrics', (req, res) => controller.getResilienceMetrics(req, res));
router.get('/resilience/trends', (req, res) => controller.getResilienceTrends(req, res));
router.get('/resilience/report', (req, res) => controller.generateResilienceReport(req, res));
router.post('/resilience/start', (req, res) => controller.startResilienceMonitoring(req, res));

// Alert Management Routes
router.get('/alerts', (req, res) => controller.getSystemAlerts(req, res));
router.post('/alerts/:alertId/resolve', (req, res) => controller.resolveAlert(req, res));

// System Status
router.get('/system/status', (req, res) => controller.getSystemStatus(req, res));

export default router; 