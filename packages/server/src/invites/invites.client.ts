import { serviceRequest } from '../shared/serviceClient.js';
import { config } from '../config/index.js';

const base = () => config.messagingServiceUrl;

export function createInvite(userToken: string, serverId: string, body: Record<string, unknown>) {
  return serviceRequest(base(), `/servers/${serverId}/invites`, { method: 'POST', userToken, body });
}

export function listInvites(userToken: string, serverId: string) {
  return serviceRequest(base(), `/servers/${serverId}/invites`, { userToken });
}

export function revokeInvite(userToken: string, serverId: string, code: string) {
  return serviceRequest(base(), `/servers/${serverId}/invites/${code}`, { method: 'DELETE', userToken });
}

export function joinViaInvite(userToken: string, code: string) {
  return serviceRequest(base(), `/invites/${code}/join`, { method: 'POST', userToken });
}

export function getDefaultInvite(userToken: string, serverId: string) {
  return serviceRequest(base(), `/servers/${serverId}/invites/default`, { userToken });
}
