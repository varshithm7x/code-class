import { Router } from 'express';
import { getStudentProfile } from './students.controller';
import { protect, isTeacher } from '../auth/auth.middleware';

const router = Router();

router.get('/:studentId', protect, isTeacher, getStudentProfile);

export default router; 