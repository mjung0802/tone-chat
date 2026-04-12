import express from 'express';
import { httpLogger } from 'tone-chat-logger';
import { logger } from './shared/logger.js';
import { internalAuth } from './shared/middleware/internalAuth.js';
import { verifyUserToken } from './shared/middleware/verifyUserToken.js';
import { errorHandler } from './shared/middleware/errorHandler.js';
import { serversRouter } from './servers/servers.routes.js';
import { channelsRouter } from './channels/channels.routes.js';
import { messagesRouter } from './messages/messages.routes.js';
import { membersRouter } from './members/members.routes.js';
import { invitesRouter, joinRouter } from './invites/invites.routes.js';
import { bansRouter } from './bans/bans.routes.js';
import { auditLogRouter } from './auditLog/auditLog.routes.js';
import { dmsRouter } from './dms/dm.routes.js';

export const app = express();

app.use(express.json());
app.use(httpLogger(logger));

// Health check (no auth required)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// All routes require internal auth + verified user token
app.use(internalAuth);
app.use(verifyUserToken);

app.use('/servers', serversRouter);
app.use('/servers/:serverId/channels', channelsRouter);
app.use('/servers/:serverId/channels/:channelId/messages', messagesRouter);
app.use('/servers/:serverId/members', membersRouter);
app.use('/servers/:serverId/invites', invitesRouter);
app.use('/servers/:serverId/bans', bansRouter);
app.use('/servers/:serverId/audit-log', auditLogRouter);
app.use('/invites', joinRouter);
app.use('/dms', dmsRouter);

app.use(errorHandler);
