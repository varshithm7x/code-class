import { Router } from 'express';
import {
  createAssignment,
  getAssignmentById,
  getMyAssignments,
  checkSubmissions,
  checkAssignmentSubmissions,
  updateAssignment,
  deleteAssignment,
  checkLeetCodeSubmissionsForAssignment,
} from './assignments.controller';
import { protect, isTeacher } from '../auth/auth.middleware';

const router = Router();

// Debug middleware to log all assignment API calls
router.use((req, res, next) => {
  console.log(`🔗 [DEBUG] Assignment API called: ${req.method} ${req.originalUrl}`);
  console.log(`🔗 [DEBUG] Request params:`, req.params);
  console.log(`🔗 [DEBUG] Request body:`, req.body);
  console.log(`🔗 [DEBUG] User:`, (req as any).user?.userId);
  next();
});

router.post('/', protect, isTeacher, createAssignment);
router.post('/check-submissions', protect, isTeacher, checkSubmissions);
router.get('/my', protect, getMyAssignments);
router.get('/:assignmentId', protect, getAssignmentById);
router.put('/:assignmentId', protect, isTeacher, updateAssignment);
router.patch('/:assignmentId', protect, isTeacher, updateAssignment);
router.post('/:assignmentId/check-submissions', protect, isTeacher, checkAssignmentSubmissions);
router.post('/:assignmentId/sync-leetcode', protect, isTeacher, checkLeetCodeSubmissionsForAssignment);
router.delete('/:assignmentId', protect, isTeacher, deleteAssignment);

export default router; 