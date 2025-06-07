import { Router } from 'express';
import { signup, login } from './auth.controller';
import { getProfile, updateProfile } from './profile.controller';
import { protect } from './auth.middleware';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);

router.get('/profile', protect, getProfile);
router.patch('/profile', protect, updateProfile);

export default router; 