import express from 'express';
import { internalAuth } from './shared/middleware/internalAuth.js';
import { errorHandler } from './shared/middleware/errorHandler.js';
import { serversRouter } from './servers/servers.routes.js';
import { channelsRouter } from './channels/channels.routes.js';
import { messagesRouter } from './messages/messages.routes.js';
import { membersRouter } from './members/members.routes.js';
import { invitesRouter, joinRouter } from './invites/invites.routes.js';

export const app = express();

app.use(express.json());

// Health check (no auth required)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// All routes require internal auth
app.use(internalAuth);

app.use('/servers', serversRouter);
app.use('/servers/:serverId/channels', channelsRouter);
app.use('/servers/:serverId/channels/:channelId/messages', messagesRouter);
app.use('/servers/:serverId/members', membersRouter);
app.use('/servers/:serverId/invites', invitesRouter);
app.use('/invites', joinRouter);

app.use(errorHandler);
