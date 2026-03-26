import { Router } from 'express';
import { requireConversationParticipant } from './middleware.js';
import {
  editDmMessage,
  getConversation,
  getOrCreateConversation,
  listConversations,
  listDmMessages,
  sendDmMessage,
  toggleDmReaction,
} from './dm.controller.js';

export const dmsRouter = Router();

dmsRouter.post('/:otherUserId', getOrCreateConversation);
dmsRouter.get('/', listConversations);
dmsRouter.get('/:conversationId', requireConversationParticipant, getConversation);
dmsRouter.get('/:conversationId/messages', requireConversationParticipant, listDmMessages);
dmsRouter.post('/:conversationId/messages', requireConversationParticipant, sendDmMessage);
dmsRouter.patch('/:conversationId/messages/:messageId', requireConversationParticipant, editDmMessage);
dmsRouter.put('/:conversationId/messages/:messageId/reactions', requireConversationParticipant, toggleDmReaction);
