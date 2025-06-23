import { Router } from 'express';
import { MonitoringController } from './monitoring.controller';

const router = Router();

// System health endpoint - public for load balancers
router.get('/health', MonitoringController.getSystemHealth);

// Dashboard summary - key metrics for admins
router.get('/dashboard', MonitoringController.getDashboardSummary);

// Efficiency metrics - show multi-test performance gains
router.get('/efficiency', MonitoringController.getEfficiencyMetrics);

// User adoption metrics
router.get('/adoption', MonitoringController.getUserAdoption);

// Full system metrics - detailed view
router.get('/metrics', MonitoringController.getSystemMetrics);

// Reset metrics (admin only - for testing/maintenance)
router.post('/reset', MonitoringController.resetMetrics);

export default router; 