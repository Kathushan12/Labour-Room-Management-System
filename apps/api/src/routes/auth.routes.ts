import express, { Router } from 'express';
import { login, refresh, logout, getMe, changePassword } from '../controllers/auth.controller.js';
import { authenticateAllowPendingPasswordChange } from '../common/middleware/auth.middleware.js';
import { csrfProtection } from '../common/middleware/csrf.middleware.js';
import { loginRateLimitMiddleware } from '../common/middleware/rate-limiter.js';

export const authRouter: Router = express.Router();

authRouter.post('/login', loginRateLimitMiddleware, login);
authRouter.post('/refresh', csrfProtection, refresh);
authRouter.post('/logout', csrfProtection, logout);
authRouter.get('/me', authenticateAllowPendingPasswordChange, getMe);
authRouter.post('/change-password', authenticateAllowPendingPasswordChange, changePassword);
