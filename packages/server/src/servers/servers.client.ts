import { serviceRequest } from '../shared/serviceClient.js';
import { config } from '../config/index.js';

const base = () => config.messagingServiceUrl;

export function createServer(userToken: string, body: Record<string, unknown>) {
  return serviceRequest(base(), '/servers', { method: 'POST', userToken, body });
}

export function listServers(userToken: string) {
  return serviceRequest(base(), '/servers', { userToken });
}

export function getServer(userToken: string, serverId: string) {
  return serviceRequest(base(), `/servers/${serverId}`, { userToken });
}

export function updateServer(userToken: string, serverId: string, body: Record<string, unknown>) {
  return serviceRequest(base(), `/servers/${serverId}`, { method: 'PATCH', userToken, body });
}

export function deleteServer(userToken: string, serverId: string) {
  return serviceRequest(base(), `/servers/${serverId}`, { method: 'DELETE', userToken });
}

export function listCustomTones(userToken: string, serverId: string) {
  return serviceRequest(base(), `/servers/${serverId}/tones`, { userToken });
}

export function addCustomTone(userToken: string, serverId: string, body: Record<string, unknown>) {
  return serviceRequest(base(), `/servers/${serverId}/tones`, { method: 'POST', userToken, body });
}

export function removeCustomTone(userToken: string, serverId: string, toneKey: string) {
  return serviceRequest(base(), `/servers/${serverId}/tones/${toneKey}`, { method: 'DELETE', userToken });
}

export function transferOwnership(userToken: string, serverId: string, body: Record<string, unknown>) {
  return serviceRequest(base(), `/servers/${serverId}/transfer`, { method: 'POST', userToken, body });
}

export function updateInviteSettings(userToken: string, serverId: string, body: Record<string, unknown>) {
  return serviceRequest(base(), `/servers/${serverId}/invite-settings`, { method: 'PATCH', userToken, body });
}
