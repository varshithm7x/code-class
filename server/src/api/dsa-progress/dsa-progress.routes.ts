import express from 'express';
import { protect } from '../auth/auth.middleware';
import { 
  getUserDSAProgress,
  updateQuestionCompletion,
  updateQuestionRevision,
  updateQuestionNotes,
  getDSAStatistics,
  bulkUpdateProgress
} from './dsa-progress.controller';

const router = express.Router();

// Get user's DSA progress (requires auth)
router.get('/progress', protect, getUserDSAProgress);

// Get DSA statistics (requires auth)
router.get('/statistics', protect, getDSAStatistics);

// Update question completion status
router.patch('/progress/:questionId/completion', protect, updateQuestionCompletion);

// Update question revision status
router.patch('/progress/:questionId/revision', protect, updateQuestionRevision);

// Update question notes
router.patch('/progress/:questionId/notes', protect, updateQuestionNotes);

// Bulk update progress
router.post('/progress/bulk', protect, bulkUpdateProgress);

export default router; 