import { Router } from 'express';
import { signup, login } from './auth.controller';
import { getProfile, updateProfile, linkLeetCodeCredentials } from './profile.controller';
import { protect } from './auth.middleware';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);

router.get('/me', protect, getProfile);
router.get('/profile', protect, getProfile);
router.patch('/profile', protect, updateProfile);
router.post('/leetcode-credentials', protect, linkLeetCodeCredentials);

export default router; 