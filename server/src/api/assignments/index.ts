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

const router = Router();

// Student routes
router.get('/my', protect, getMyAssignments);
router.post('/:assignmentId/check-submissions', protect, checkAssignmentSubmissions);
router.post('/:assignmentId/check-my-submissions', protect, checkMySubmissionsForAssignment);
router.post('/:assignmentId/mark-completed', protect, markAllAsCompleted);

// Teacher-specific routes
router.get('/:assignmentId', protect, getAssignmentById);

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