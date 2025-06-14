import { Router } from 'express';
import { createAnnouncement, getClassAnnouncements, deleteAnnouncement } from './announcement.controller';
import { protect, isTeacher } from '../auth/auth.middleware';

const router = Router();

// Get all announcements for a class
router.get('/class/:classId', protect, getClassAnnouncements);

// Create a new announcement for a class (teacher only)
router.post('/class/:classId', protect, isTeacher, createAnnouncement);

// Delete an announcement (teacher only)
router.delete('/:announcementId', protect, isTeacher, deleteAnnouncement);

export default router; 