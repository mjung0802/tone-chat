import { serviceRequest } from '../shared/serviceClient.js';
import { config } from '../config/index.js';

const base = () => config.messagingServiceUrl;

export function listBans(userId: string, serverId: string) {
  return serviceRequest(base(), `/servers/${serverId}/bans`, { userId });
}

export function unbanUser(userId: string, serverId: string, targetUserId: string) {
  return serviceRequest(base(), `/servers/${serverId}/bans/${targetUserId}`, { method: 'DELETE', userId });
}
