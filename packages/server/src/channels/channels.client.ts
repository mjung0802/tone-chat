import { serviceRequest } from '../shared/serviceClient.js';
import { config } from '../config/index.js';

const base = () => config.messagingServiceUrl;

export function createChannel(userToken: string, serverId: string, body: Record<string, unknown>) {
  return serviceRequest(base(), `/servers/${serverId}/channels`, { method: 'POST', userToken, body });
}

export function listChannels(userToken: string, serverId: string) {
  return serviceRequest(base(), `/servers/${serverId}/channels`, { userToken });
}

export function getChannel(userToken: string, serverId: string, channelId: string) {
  return serviceRequest(base(), `/servers/${serverId}/channels/${channelId}`, { userToken });
}

export function updateChannel(userToken: string, serverId: string, channelId: string, body: Record<string, unknown>) {
  return serviceRequest(base(), `/servers/${serverId}/channels/${channelId}`, { method: 'PATCH', userToken, body });
}

export function deleteChannel(userToken: string, serverId: string, channelId: string) {
  return serviceRequest(base(), `/servers/${serverId}/channels/${channelId}`, { method: 'DELETE', userToken });
}
