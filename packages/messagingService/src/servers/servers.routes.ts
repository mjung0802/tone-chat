import { Router } from 'express';
import { createServer, getServer, listServers, updateServer, deleteServer, transferOwnership } from './servers.controller.js';
import { requireMember } from '../shared/middleware/requireMember.js';
import { requireRole } from '../shared/middleware/requireRole.js';
import { listCustomTones, addCustomTone, removeCustomTone } from './customTones.controller.js';

export const serversRouter = Router();

serversRouter.post('/', createServer);
serversRouter.get('/', listServers);
serversRouter.get('/:serverId', getServer);
serversRouter.patch('/:serverId', updateServer);
serversRouter.delete('/:serverId', deleteServer);

serversRouter.post('/:serverId/transfer', requireMember, transferOwnership);

serversRouter.get('/:serverId/tones', requireMember, listCustomTones);
serversRouter.post('/:serverId/tones', requireRole('admin'), addCustomTone);
serversRouter.delete('/:serverId/tones/:toneKey', requireRole('admin'), removeCustomTone);
