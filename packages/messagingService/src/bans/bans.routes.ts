import { Router } from 'express';
import { unbanUser, listBans } from './bans.controller.js';
import { requireRole } from '../shared/middleware/requireRole.js';

export const bansRouter = Router({ mergeParams: true });

bansRouter.get('/', requireRole('admin'), listBans);
bansRouter.delete('/:userId', requireRole('admin'), unbanUser);
