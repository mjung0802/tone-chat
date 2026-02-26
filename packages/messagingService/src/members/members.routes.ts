import { Router } from 'express';
import { joinServer, listMembers, getMember, updateMember, removeMember } from './members.controller.js';

export const membersRouter = Router({ mergeParams: true });

membersRouter.post('/', joinServer);
membersRouter.get('/', listMembers);
membersRouter.get('/:userId', getMember);
membersRouter.patch('/:userId', updateMember);
membersRouter.delete('/:userId', removeMember);
