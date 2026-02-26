import express from 'express';
import { authRouter } from './auth/auth.routes.js';
import { usersRouter } from './users/users.routes.js';
import { internalAuth } from './shared/middleware/internalAuth.js';
import { errorHandler } from './shared/middleware/errorHandler.js';

export const app = express();

app.use(express.json());

// Health check (no auth required)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Auth routes are called by BFF with internal key
app.use('/auth', internalAuth, authRouter);

// User routes are called by BFF with internal key + X-User-Id
app.use('/users', internalAuth, usersRouter);

app.use(errorHandler);
