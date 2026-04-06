import { serviceRequest } from '../shared/serviceClient.js';
import { config } from '../config/index.js';

export function getOrCreateConversation(userToken: string, otherUserId: string) {
  return serviceRequest(config.messagingServiceUrl, `/dms/${otherUserId}`, { method: 'POST', userToken });
}

export function getConversation(userToken: string, conversationId: string) {
  return serviceRequest(config.messagingServiceUrl, `/dms/${conversationId}`, { userToken });
}

export function listConversations(userToken: string) {
  return serviceRequest(config.messagingServiceUrl, '/dms', { userToken });
}

export function listDmMessages(userToken: string, conversationId: string, queryString: string) {
  const path = queryString ? `/dms/${conversationId}/messages?${queryString}` : `/dms/${conversationId}/messages`;
  return serviceRequest(config.messagingServiceUrl, path, { userToken });
}

export function sendDmMessage(userToken: string, conversationId: string, body: Record<string, unknown>) {
  return serviceRequest(config.messagingServiceUrl, `/dms/${conversationId}/messages`, { method: 'POST', userToken, body });
}

export function editDmMessage(userToken: string, conversationId: string, messageId: string, body: Record<string, unknown>) {
  return serviceRequest(config.messagingServiceUrl, `/dms/${conversationId}/messages/${messageId}`, { method: 'PATCH', userToken, body });
}

export function reactToDmMessage(userToken: string, conversationId: string, messageId: string, body: Record<string, unknown>) {
  return serviceRequest(config.messagingServiceUrl, `/dms/${conversationId}/messages/${messageId}/reactions`, { method: 'PUT', userToken, body });
}
