import { Router } from 'express';
import { joinServer, listMembers, getMember, updateMember, removeMember, muteMember, unmuteMember, promoteMember, demoteMember } from './members.controller.js';
import { banMember } from '../bans/bans.controller.js';
import { requireMember } from '../shared/middleware/requireMember.js';
import { requireRole } from '../shared/middleware/requireRole.js';

export const membersRouter = Router({ mergeParams: true });

membersRouter.post('/', joinServer); // No middleware — user isn't a member yet
membersRouter.get('/', requireMember, listMembers);
membersRouter.get('/:userId', requireMember, getMember);
membersRouter.patch('/:userId', requireRole('admin'), updateMember);
membersRouter.delete('/:userId', requireMember, removeMember); // Self-leave or mod+ kick (checked in controller)

// Moderation actions
membersRouter.post('/:userId/mute', requireRole('mod'), muteMember);
membersRouter.delete('/:userId/mute', requireRole('mod'), unmuteMember);
membersRouter.post('/:userId/promote', requireRole('mod'), promoteMember);
membersRouter.post('/:userId/demote', requireRole('mod'), demoteMember);
membersRouter.post('/:userId/ban', requireRole('mod'), banMember);
