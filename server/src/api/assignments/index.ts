import { Router } from 'express';
import {
  createAssignment,
  getAssignmentById,
  checkSubmissions,
  checkAssignmentSubmissions,
  updateAssignment,
} from './assignments.controller';
import { protect, isTeacher } from '../auth/auth.middleware';

const router = Router();

router.post('/', protect, isTeacher, createAssignment);
router.post('/check-submissions', protect, isTeacher, checkSubmissions);
router.get('/:assignmentId', protect, getAssignmentById);
router.post('/:assignmentId/check-submissions', protect, isTeacher, checkAssignmentSubmissions);
router.patch('/:assignmentId', protect, isTeacher, updateAssignment);

export default router; 