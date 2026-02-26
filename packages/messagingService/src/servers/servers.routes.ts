import { Router } from 'express';
import { createServer, getServer, listServers, updateServer, deleteServer } from './servers.controller.js';

export const serversRouter = Router();

serversRouter.post('/', createServer);
serversRouter.get('/', listServers);
serversRouter.get('/:serverId', getServer);
serversRouter.patch('/:serverId', updateServer);
serversRouter.delete('/:serverId', deleteServer);
