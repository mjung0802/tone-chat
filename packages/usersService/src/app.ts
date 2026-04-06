import express from 'express';
import { authRouter } from './auth/auth.routes.js';
import { usersRouter } from './users/users.routes.js';
import { internalRouter } from './users/internal.routes.js';
import { internalAuth } from './shared/middleware/internalAuth.js';
import { verifyUserToken } from './shared/middleware/verifyUserToken.js';
import { errorHandler } from './shared/middleware/errorHandler.js';

export const app = express();

app.use(express.json());

// Health check (no auth required)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Auth routes are called by BFF with internal key only (no user token — these are the auth endpoints)
app.use('/auth', internalAuth, authRouter);

// Internal BFF-to-service routes (no user token needed — just internal key)
app.use('/internal', internalAuth, internalRouter);

// User routes are called by BFF with internal key + verified user token
app.use('/users', internalAuth, verifyUserToken, usersRouter);

app.use(errorHandler);
