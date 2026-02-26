import { serviceRequest } from '../shared/serviceClient.js';
import { config } from '../config/index.js';

const base = () => config.messagingServiceUrl;

export function createInvite(userId: string, serverId: string, body: Record<string, unknown>) {
  return serviceRequest(base(), `/servers/${serverId}/invites`, { method: 'POST', userId, body });
}

export function listInvites(userId: string, serverId: string) {
  return serviceRequest(base(), `/servers/${serverId}/invites`, { userId });
}

export function revokeInvite(userId: string, serverId: string, code: string) {
  return serviceRequest(base(), `/servers/${serverId}/invites/${code}`, { method: 'DELETE', userId });
}

export function joinViaInvite(userId: string, code: string) {
  return serviceRequest(base(), `/invites/${code}/join`, { method: 'POST', userId });
}
