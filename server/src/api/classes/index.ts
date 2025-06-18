import { Router } from 'express';
import {
  createClass,
  getClasses,
  joinClass,
  getClassAssignments,
  getClassDetails,
  deleteClass,
  getClassJudge0Status,
} from './class.controller';
import { protect, isTeacher, isStudent } from '../auth/auth.middleware';

const router = Router();

router.get('/', protect, getClasses);
router.post('/', protect, isTeacher, createClass);
router.post('/join', protect, isStudent, joinClass);
router.get('/:classId', protect, getClassDetails);
router.get('/:classId/assignments', protect, getClassAssignments);
router.get('/:classId/judge0-status', protect, isTeacher, getClassJudge0Status);
router.delete('/:classId', protect, isTeacher, deleteClass);

export default router; 