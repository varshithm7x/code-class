import express from 'express';
import { getLeaderboard, getClassCompletionData, getPlatformData, getDifficultyData } from './analytics.controller';
import { protect } from '../auth/auth.middleware';

const router = express.Router();

// All analytics routes require authentication
router.use(protect);

// GET /analytics/leaderboard - Get global or class-specific leaderboard
router.get('/leaderboard', getLeaderboard);

// GET /analytics/:classId/completion - Get class completion data over time
router.get('/:classId/completion', getClassCompletionData);

// GET /analytics/:classId/platforms - Get platform distribution for a class
router.get('/:classId/platforms', getPlatformData);

// GET /analytics/:classId/difficulty - Get difficulty distribution for a class
router.get('/:classId/difficulty', getDifficultyData);

export default router; 