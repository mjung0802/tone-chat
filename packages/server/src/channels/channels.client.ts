import { serviceRequest } from '../shared/serviceClient.js';
import { config } from '../config/index.js';

const base = () => config.messagingServiceUrl;

export function createChannel(userId: string, serverId: string, body: Record<string, unknown>) {
  return serviceRequest(base(), `/servers/${serverId}/channels`, { method: 'POST', userId, body });
}

export function listChannels(userId: string, serverId: string) {
  return serviceRequest(base(), `/servers/${serverId}/channels`, { userId });
}

export function getChannel(userId: string, serverId: string, channelId: string) {
  return serviceRequest(base(), `/servers/${serverId}/channels/${channelId}`, { userId });
}

export function updateChannel(userId: string, serverId: string, channelId: string, body: Record<string, unknown>) {
  return serviceRequest(base(), `/servers/${serverId}/channels/${channelId}`, { method: 'PATCH', userId, body });
}

export function deleteChannel(userId: string, serverId: string, channelId: string) {
  return serviceRequest(base(), `/servers/${serverId}/channels/${channelId}`, { method: 'DELETE', userId });
}
