import express from 'express';
import {
  register,
  login,
  logout,
  refresh,
  getMe,
  getCsrf
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { loginLimiter, registerLimiter, refreshLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.post('/refresh', refreshLimiter, refresh);
router.get('/me', requireAuth, getMe);
router.get('/csrf', getCsrf);

export default router;
