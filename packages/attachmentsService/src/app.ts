import express from 'express';
import { httpLogger } from 'tone-chat-logger';
import { logger } from './shared/logger.js';
import { internalAuth } from './shared/middleware/internalAuth.js';
import { verifyUserToken } from './shared/middleware/verifyUserToken.js';
import { errorHandler } from './shared/middleware/errorHandler.js';
import { attachmentsRouter } from './attachments/attachments.routes.js';

export const app = express();

app.use(express.json());
app.use(httpLogger(logger));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/attachments', internalAuth, verifyUserToken, attachmentsRouter);

app.use(errorHandler);
