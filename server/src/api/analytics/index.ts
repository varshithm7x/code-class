import { Router } from 'express';
import { 
  getLeaderboard, 
  getClassCompletionData, 
  getPlatformData, 
  getDifficultyData,
  getClassAnalytics,
  getStudentDetailedAnalytics 
} from './analytics.controller';
import { protect } from '../auth/auth.middleware';
import { cacheMiddleware } from '../middleware/cache';

const router = Router();

// Apply caching middleware to the most data-intensive endpoints
router.get('/leaderboard', protect, cacheMiddleware, getLeaderboard);
router.get('/class/:classId/completion', protect, cacheMiddleware, getClassCompletionData);
router.get('/class/:classId/platform', protect, cacheMiddleware, getPlatformData);
router.get('/class/:classId/difficulty', protect, cacheMiddleware, getDifficultyData);
router.get('/class/:classId', protect, cacheMiddleware, getClassAnalytics);
router.get('/student/:studentId', protect, cacheMiddleware, getStudentDetailedAnalytics);

export default router; 