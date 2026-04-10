import { serviceRequest } from '../shared/serviceClient.js';
import { config } from '../config/index.js';

const base = () => config.messagingServiceUrl;

export function createMessage(userToken: string, serverId: string, channelId: string, body: Record<string, unknown>) {
  return serviceRequest(base(), `/servers/${serverId}/channels/${channelId}/messages`, { method: 'POST', userToken, body });
}

export function listMessages(userToken: string, serverId: string, channelId: string, query: string) {
  const qs = query ? `?${query}` : '';
  return serviceRequest(base(), `/servers/${serverId}/channels/${channelId}/messages${qs}`, { userToken });
}

export function updateMessage(userToken: string, serverId: string, channelId: string, messageId: string, body: Record<string, unknown>) {
  return serviceRequest(base(), `/servers/${serverId}/channels/${channelId}/messages/${messageId}`, { method: 'PATCH', userToken, body });
}

export function toggleReaction(userToken: string, serverId: string, channelId: string, messageId: string, body: Record<string, unknown>) {
  return serviceRequest(base(), `/servers/${serverId}/channels/${channelId}/messages/${messageId}/reactions`, { method: 'PUT', userToken, body });
}

export function deleteMessage(userToken: string, serverId: string, channelId: string, messageId: string) {
  return serviceRequest(base(), `/servers/${serverId}/channels/${channelId}/messages/${messageId}`, { method: 'DELETE', userToken });
}
