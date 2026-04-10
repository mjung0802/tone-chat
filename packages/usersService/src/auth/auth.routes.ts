import { Router } from 'express';
import { register, login, refresh, logout, verifyEmail, resendVerification } from './auth.controller.js';
import { verifyUserToken } from '../shared/middleware/verifyUserToken.js';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);
authRouter.post('/verify-email', verifyUserToken, verifyEmail);
authRouter.post('/resend-verification', verifyUserToken, resendVerification);
