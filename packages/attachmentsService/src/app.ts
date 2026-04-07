import express from 'express';
import { getPublicFile } from './attachments/attachments.controller.js';
import { attachmentsRouter } from './attachments/attachments.routes.js';
import { errorHandler } from './shared/middleware/errorHandler.js';
import { internalAuth, requireInternalUserId } from './shared/middleware/internalAuth.js';

export const app = express();

app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/attachments/public/:token', getPublicFile);

app.use('/attachments', internalAuth, requireInternalUserId, attachmentsRouter);

app.use(errorHandler);
