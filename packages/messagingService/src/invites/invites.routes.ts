import { Router } from 'express';
import { createInvite, listInvites, revokeInvite, joinViaInvite } from './invites.controller.js';

// Server-scoped invite routes
export const invitesRouter = Router({ mergeParams: true });

invitesRouter.post('/', createInvite);
invitesRouter.get('/', listInvites);
invitesRouter.delete('/:code', revokeInvite);

// Top-level join route (separate router)
export const joinRouter = Router();

joinRouter.post('/:code/join', joinViaInvite);
