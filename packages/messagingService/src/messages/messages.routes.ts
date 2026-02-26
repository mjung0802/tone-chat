import { Router } from 'express';
import { createMessage, listMessages, updateMessage } from './messages.controller.js';

export const messagesRouter = Router({ mergeParams: true });

messagesRouter.post('/', createMessage);
messagesRouter.get('/', listMessages);
messagesRouter.patch('/:messageId', updateMessage);
