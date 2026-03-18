import { Router } from 'express';
import { createInvite, listInvites, revokeInvite, joinViaInvite } from './invites.controller.js';
import { requireRole } from '../shared/middleware/requireRole.js';

// Server-scoped invite routes
export const invitesRouter = Router({ mergeParams: true });

invitesRouter.post('/', requireRole('admin'), createInvite);
invitesRouter.get('/', requireRole('admin'), listInvites);
invitesRouter.delete('/:code', requireRole('admin'), revokeInvite);

// Top-level join route (separate router)
export const joinRouter = Router();

joinRouter.post('/:code/join', joinViaInvite);
