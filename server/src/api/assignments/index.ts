import { Router } from 'express';
import { protect } from '../auth/auth.middleware';
import {
  createAssignment,
  getAssignmentById,
  deleteAssignment,
  updateAssignment,
  checkSubmissions,
  checkAssignmentSubmissions,
  getMyAssignments,
  markAllAsCompleted,
} from './assignments.controller';

const router = Router();

// Student routes
router.get('/my', protect, getMyAssignments);

// Assignment CRUD
router.post('/', protect, createAssignment);
router.get('/:assignmentId', protect, getAssignmentById);
router.patch('/:assignmentId', protect, updateAssignment);
router.delete('/:assignmentId', protect, deleteAssignment);

// Submission checking
router.post('/check-submissions', protect, checkSubmissions);
router.post('/:assignmentId/check-submissions', protect, checkAssignmentSubmissions);

// Mark all as completed
router.put('/:assignmentId/students/:studentId/mark-all-completed', protect, markAllAsCompleted);

export default router; 