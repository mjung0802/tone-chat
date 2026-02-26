import { serviceRequest } from '../shared/serviceClient.js';
import { config } from '../config/index.js';

const base = () => config.messagingServiceUrl;

export function createMessage(userId: string, serverId: string, channelId: string, body: Record<string, unknown>) {
  return serviceRequest(base(), `/servers/${serverId}/channels/${channelId}/messages`, { method: 'POST', userId, body });
}

export function listMessages(userId: string, serverId: string, channelId: string, query: string) {
  const qs = query ? `?${query}` : '';
  return serviceRequest(base(), `/servers/${serverId}/channels/${channelId}/messages${qs}`, { userId });
}

export function updateMessage(userId: string, serverId: string, channelId: string, messageId: string, body: Record<string, unknown>) {
  return serviceRequest(base(), `/servers/${serverId}/channels/${channelId}/messages/${messageId}`, { method: 'PATCH', userId, body });
}
