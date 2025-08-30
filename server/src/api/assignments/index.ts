import { Router } from 'express';
import { protect } from '../auth/auth.middleware';
import {
  createAssignment,
  getAssignmentById,
  deleteAssignment,
  updateAssignment,
  checkSubmissions,
  checkAssignmentSubmissions,
  checkMySubmissionsForAssignment,
  getMyAssignments,
  markAllAsCompleted,
  extractProblemFromUrl,
  debugExtractProblemFromUrl
} from './assignments.controller';
import { cacheMiddleware } from '../middleware/cache';

const router = Router();

// Conditional cache middleware - can be disabled via environment variable
const maybeCache = (req: any, res: any, next: any) => {
  if (process.env.DISABLE_ASSIGNMENT_CACHE === 'true') {
    console.log('Assignment cache disabled via environment variable');
    return next();
  }
  return cacheMiddleware(req, res, next);
};

// Student routes
router.get('/my', protect, getMyAssignments);
router.post('/:assignmentId/check-submissions', protect, checkAssignmentSubmissions);
router.post('/:assignmentId/check-my-submissions', protect, checkMySubmissionsForAssignment);
router.post('/:assignmentId/mark-completed', protect, markAllAsCompleted);

// Teacher-specific routes
router.get('/:assignmentId', protect, maybeCache, getAssignmentById);

// Assignment CRUD
router.post('/', protect, createAssignment);
router.patch('/:assignmentId', protect, updateAssignment);
router.delete('/:assignmentId', protect, deleteAssignment);

// Submission checking
router.post('/check-submissions', protect, checkSubmissions);

// Mark all as completed
router.put('/:assignmentId/students/:studentId/mark-all-completed', protect, markAllAsCompleted);

// Extract problem details from URL
router.post('/extract-from-url', protect, extractProblemFromUrl);
router.post('/debug-extract-from-url', protect, debugExtractProblemFromUrl);

export default router; 