import { Router } from 'express';
import type { AuthRequest } from '../shared/middleware/auth.js';
import * as client from './invites.client.js';
import { mutationLimiters } from '../shared/rateLimiters.js';

// Server-scoped invite routes
export const serverInvitesRouter = Router({ mergeParams: true });

serverInvitesRouter.post('/', mutationLimiters.invite, async (req: AuthRequest, res) => {
  const result = await client.createInvite(req.token!, req.params['serverId'] as string, req.body as Record<string, unknown>);
  res.status(result.status).json(result.data);
});

serverInvitesRouter.get('/', async (req: AuthRequest, res) => {
  const result = await client.listInvites(req.token!, req.params['serverId'] as string);
  res.status(result.status).json(result.data);
});

serverInvitesRouter.get('/default', async (req: AuthRequest, res) => {
  const result = await client.getDefaultInvite(req.token!, req.params['serverId'] as string);
  res.status(result.status).json(result.data);
});

serverInvitesRouter.delete('/:code', mutationLimiters.invite, async (req: AuthRequest, res) => {
  const result = await client.revokeInvite(req.token!, req.params['serverId'] as string, req.params['code'] as string);
  res.status(result.status).json(result.data);
});

// Top-level join route
export const joinRouter = Router();

joinRouter.get('/:code/status', async (req: AuthRequest, res) => {
  const result = await client.getInviteStatus(req.token!, req.params['code'] as string);
  res.status(result.status).json(result.data);
});

joinRouter.post('/:code/join', mutationLimiters.invite, async (req: AuthRequest, res) => {
  const result = await client.joinViaInvite(req.token!, req.params['code'] as string);
  res.status(result.status).json(result.data);
});
