import express from 'express';
import { 
  getLeaderboard, 
  getClassCompletionData, 
  getPlatformData, 
  getDifficultyData,
  getClassAnalytics,
  getStudentDetailedAnalytics 
} from './analytics.controller';
import { protect } from '../auth/auth.middleware';

const router = express.Router();

// All analytics routes require authentication
router.use(protect);

// GET /analytics/leaderboard - Get global or class-specific leaderboard
router.get('/leaderboard', getLeaderboard);

// NEW: Comprehensive analytics endpoints
// GET /analytics/class/:classId - Get comprehensive class analytics
router.get('/class/:classId', getClassAnalytics);

// GET /analytics/student/:studentId - Get detailed student analytics
router.get('/student/:studentId', getStudentDetailedAnalytics);

// Legacy endpoints (maintained for backward compatibility)
// GET /analytics/:classId/completion - Get class completion data over time
router.get('/:classId/completion', getClassCompletionData);

// Updated to support both class-specific and global queries
// GET /analytics/platform - Get platform distribution 
router.get('/platform', getPlatformData);

// GET /analytics/difficulty - Get difficulty distribution
router.get('/difficulty', getDifficultyData);

// Legacy endpoints (maintained for backward compatibility)
// GET /analytics/:classId/platforms - Get platform distribution for a class
router.get('/:classId/platforms', getPlatformData);

// GET /analytics/:classId/difficulty - Get difficulty distribution for a class
router.get('/:classId/difficulty', getDifficultyData);

export default router; 