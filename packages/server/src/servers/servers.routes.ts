import { Router } from 'express';
import type { AuthRequest } from '../shared/middleware/auth.js';
import * as client from './servers.client.js';
import { mutationLimiters } from '../shared/rateLimiters.js';
import {
  validateBody,
  createServerSchema,
  updateServerSchema,
  transferOwnershipSchema,
  addToneSchema,
  updateInviteSettingsSchema,
} from '../shared/validate.js';

export const serversRouter = Router();

serversRouter.post('/', mutationLimiters.serverWrite, validateBody(createServerSchema), async (req: AuthRequest, res) => {
  const result = await client.createServer(req.token!, req.body as Record<string, unknown>);
  res.status(result.status).json(result.data);
});

serversRouter.get('/', async (req: AuthRequest, res) => {
  const result = await client.listServers(req.token!);
  res.status(result.status).json(result.data);
});

serversRouter.get('/:serverId', async (req: AuthRequest, res) => {
  const result = await client.getServer(req.token!, req.params['serverId'] as string);
  res.status(result.status).json(result.data);
});

serversRouter.patch('/:serverId', mutationLimiters.serverWrite, validateBody(updateServerSchema), async (req: AuthRequest, res) => {
  const result = await client.updateServer(req.token!, req.params['serverId'] as string, req.body as Record<string, unknown>);
  res.status(result.status).json(result.data);
});

serversRouter.delete('/:serverId', mutationLimiters.serverWrite, async (req: AuthRequest, res) => {
  const result = await client.deleteServer(req.token!, req.params['serverId'] as string);
  res.status(result.status).end();
});

serversRouter.post('/:serverId/transfer', mutationLimiters.serverWrite, validateBody(transferOwnershipSchema), async (req: AuthRequest, res) => {
  const result = await client.transferOwnership(req.token!, req.params['serverId'] as string, req.body as Record<string, unknown>);
  res.status(result.status).json(result.data);
});

serversRouter.get('/:serverId/tones', async (req: AuthRequest, res) => {
  const result = await client.listCustomTones(req.token!, req.params['serverId'] as string);
  res.status(result.status).json(result.data);
});

serversRouter.post('/:serverId/tones', mutationLimiters.serverWrite, validateBody(addToneSchema), async (req: AuthRequest, res) => {
  const result = await client.addCustomTone(req.token!, req.params['serverId'] as string, req.body as Record<string, unknown>);
  res.status(result.status).json(result.data);
});

serversRouter.delete('/:serverId/tones/:toneKey', mutationLimiters.serverWrite, async (req: AuthRequest, res) => {
  const result = await client.removeCustomTone(req.token!, req.params['serverId'] as string, req.params['toneKey'] as string);
  res.status(result.status).end();
});

serversRouter.patch('/:serverId/invite-settings', mutationLimiters.serverWrite, validateBody(updateInviteSettingsSchema), async (req: AuthRequest, res) => {
  const result = await client.updateInviteSettings(req.token!, req.params['serverId'] as string, req.body as Record<string, unknown>);
  res.status(result.status).json(result.data);
});
