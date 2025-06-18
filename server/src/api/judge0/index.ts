import express from 'express';
import { protect, isTeacher } from '../auth/auth.middleware';
import { 
  addApiKey, 
  validateApiKey, 
  getPoolStats, 
  removeApiKey 
} from './judge0.controller';

const router = express.Router();

// Student routes
router.post('/api-key', protect, addApiKey);
router.delete('/api-key', protect, removeApiKey);
router.post('/validate-key', protect, validateApiKey);

// Teacher/Admin routes
router.get('/pool-stats', protect, isTeacher, getPoolStats);

export default router; 