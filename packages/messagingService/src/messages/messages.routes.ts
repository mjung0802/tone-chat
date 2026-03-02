import { Router } from 'express';
import { createMessage, listMessages, updateMessage } from './messages.controller.js';
import { requireMember } from '../shared/middleware/requireMember.js';

export const messagesRouter = Router({ mergeParams: true });

messagesRouter.post('/', requireMember, createMessage);
messagesRouter.get('/', requireMember, listMessages);
messagesRouter.patch('/:messageId', requireMember, updateMessage);
