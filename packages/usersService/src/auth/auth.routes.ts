import { Router } from 'express';
import { register, login, refresh, logout, verifyEmail, resendVerification } from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);
authRouter.post('/verify-email', verifyEmail);
authRouter.post('/resend-verification', resendVerification);
