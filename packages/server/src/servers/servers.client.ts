import { serviceRequest } from '../shared/serviceClient.js';
import { config } from '../config/index.js';

const base = () => config.messagingServiceUrl;

export function createServer(userId: string, body: Record<string, unknown>) {
  return serviceRequest(base(), '/servers', { method: 'POST', userId, body });
}

export function listServers(userId: string) {
  return serviceRequest(base(), '/servers', { userId });
}

export function getServer(userId: string, serverId: string) {
  return serviceRequest(base(), `/servers/${serverId}`, { userId });
}

export function updateServer(userId: string, serverId: string, body: Record<string, unknown>) {
  return serviceRequest(base(), `/servers/${serverId}`, { method: 'PATCH', userId, body });
}

export function deleteServer(userId: string, serverId: string) {
  return serviceRequest(base(), `/servers/${serverId}`, { method: 'DELETE', userId });
}
