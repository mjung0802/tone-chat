import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { httpLogger } from 'tone-chat-logger';
import { config } from './config/index.js';
import { logger } from './shared/logger.js';
import { requireAuth } from './shared/middleware/auth.js';
import { errorHandler } from './shared/middleware/errorHandler.js';
import { authRouter } from './auth/auth.routes.js';
import { usersRouter } from './users/users.routes.js';
import { serversRouter } from './servers/servers.routes.js';
import { channelsRouter } from './channels/channels.routes.js';
import { messagesRouter } from './messages/messages.routes.js';
import { membersRouter } from './members/members.routes.js';
import { attachmentsRouter } from './attachments/attachments.routes.js';
import { serverInvitesRouter, joinRouter } from './invites/invites.routes.js';
import { bansRouter } from './bans/bans.routes.js';
import { auditLogRouter } from './auditLog/auditLog.routes.js';
import { dmsRouter } from './dms/dms.routes.js';
import { healthRouter } from './health/health.routes.js';

export const app = express();

app.use(helmet());
app.use(cors({
  origin: config.allowedOrigins,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser(config.cookieSecret));
app.use(httpLogger(logger));

app.use('/api/v1/health', healthRouter);

// Public auth routes (no JWT required)
app.use('/api/v1/auth', authRouter);

// All routes below require JWT auth
app.use('/api/v1/users', requireAuth, usersRouter);
app.use('/api/v1/servers', requireAuth, serversRouter);
app.use('/api/v1/servers/:serverId/channels', requireAuth, channelsRouter);
app.use('/api/v1/servers/:serverId/channels/:channelId/messages', requireAuth, messagesRouter);
app.use('/api/v1/servers/:serverId/members', requireAuth, membersRouter);
app.use('/api/v1/servers/:serverId/invites', requireAuth, serverInvitesRouter);
app.use('/api/v1/servers/:serverId/bans', requireAuth, bansRouter);
app.use('/api/v1/servers/:serverId/audit-log', requireAuth, auditLogRouter);
app.use('/api/v1/invites', requireAuth, joinRouter);
app.use('/api/v1/attachments', requireAuth, attachmentsRouter);
app.use('/api/v1/dms', requireAuth, dmsRouter);

app.use(errorHandler);
