import { Router } from 'express';
import { createServer, getServer, listServers, updateServer, deleteServer } from './servers.controller.js';
import { requireMember } from '../shared/middleware/requireMember.js';
import { requireAdmin } from '../shared/middleware/requireAdmin.js';
import { listCustomTones, addCustomTone, removeCustomTone } from './customTones.controller.js';

export const serversRouter = Router();

serversRouter.post('/', createServer);
serversRouter.get('/', listServers);
serversRouter.get('/:serverId', getServer);
serversRouter.patch('/:serverId', updateServer);
serversRouter.delete('/:serverId', deleteServer);

serversRouter.get('/:serverId/tones', requireMember, listCustomTones);
serversRouter.post('/:serverId/tones', requireAdmin, addCustomTone);
serversRouter.delete('/:serverId/tones/:toneKey', requireAdmin, removeCustomTone);
