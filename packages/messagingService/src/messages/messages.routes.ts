import { Router } from 'express';
import { createMessage, listMessages, updateMessage, deleteMessage } from './messages.controller.js';
import { toggleReaction } from './reactions.controller.js';
import { requireMember } from '../shared/middleware/requireMember.js';

export const messagesRouter = Router({ mergeParams: true });

messagesRouter.post('/', requireMember, createMessage);
messagesRouter.get('/', requireMember, listMessages);
messagesRouter.patch('/:messageId', requireMember, updateMessage);
messagesRouter.delete('/:messageId', requireMember, deleteMessage);
messagesRouter.put('/:messageId/reactions', requireMember, toggleReaction);
