import { serviceRequest } from '../shared/serviceClient.js';
import { config } from '../config/index.js';

const base = () => config.messagingServiceUrl;

export function listBans(userToken: string, serverId: string) {
  return serviceRequest(base(), `/servers/${serverId}/bans`, { userToken });
}

export function unbanUser(userToken: string, serverId: string, targetUserId: string) {
  return serviceRequest(base(), `/servers/${serverId}/bans/${targetUserId}`, { method: 'DELETE', userToken });
}
