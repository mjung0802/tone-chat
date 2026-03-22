import { serviceRequest } from '../shared/serviceClient.js';
import { config } from '../config/index.js';

export function getOrCreateConversation(userId: string, otherUserId: string) {
  return serviceRequest(config.messagingServiceUrl, `/dms/${otherUserId}`, { method: 'POST', userId });
}

export function getConversation(userId: string, conversationId: string) {
  return serviceRequest(config.messagingServiceUrl, `/dms/${conversationId}`, { userId });
}

export function listConversations(userId: string) {
  return serviceRequest(config.messagingServiceUrl, '/dms', { userId });
}

export function listDmMessages(userId: string, conversationId: string, queryString: string) {
  const path = queryString ? `/dms/${conversationId}/messages?${queryString}` : `/dms/${conversationId}/messages`;
  return serviceRequest(config.messagingServiceUrl, path, { userId });
}

export function sendDmMessage(userId: string, conversationId: string, body: Record<string, unknown>) {
  return serviceRequest(config.messagingServiceUrl, `/dms/${conversationId}/messages`, { method: 'POST', userId, body });
}

export function editDmMessage(userId: string, conversationId: string, messageId: string, body: Record<string, unknown>) {
  return serviceRequest(config.messagingServiceUrl, `/dms/${conversationId}/messages/${messageId}`, { method: 'PATCH', userId, body });
}

export function reactToDmMessage(userId: string, conversationId: string, messageId: string, body: Record<string, unknown>) {
  return serviceRequest(config.messagingServiceUrl, `/dms/${conversationId}/messages/${messageId}/reactions`, { method: 'PUT', userId, body });
}
