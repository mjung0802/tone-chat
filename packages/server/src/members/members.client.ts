import { serviceRequest } from '../shared/serviceClient.js';
import { config } from '../config/index.js';

const base = () => config.messagingServiceUrl;

export function joinServer(userToken: string, serverId: string) {
  return serviceRequest(base(), `/servers/${serverId}/members`, { method: 'POST', userToken });
}

export function listMembers(userToken: string, serverId: string) {
  return serviceRequest(base(), `/servers/${serverId}/members`, { userToken });
}

export function getMember(userToken: string, serverId: string, targetUserId: string) {
  return serviceRequest(base(), `/servers/${serverId}/members/${targetUserId}`, { userToken });
}

export function updateMember(userToken: string, serverId: string, targetUserId: string, body: Record<string, unknown>) {
  return serviceRequest(base(), `/servers/${serverId}/members/${targetUserId}`, { method: 'PATCH', userToken, body });
}

export function removeMember(userToken: string, serverId: string, targetUserId: string) {
  return serviceRequest(base(), `/servers/${serverId}/members/${targetUserId}`, { method: 'DELETE', userToken });
}

export function muteMember(userToken: string, serverId: string, targetUserId: string, body: Record<string, unknown>) {
  return serviceRequest(base(), `/servers/${serverId}/members/${targetUserId}/mute`, { method: 'POST', userToken, body });
}

export function unmuteMember(userToken: string, serverId: string, targetUserId: string) {
  return serviceRequest(base(), `/servers/${serverId}/members/${targetUserId}/mute`, { method: 'DELETE', userToken });
}

export function promoteMember(userToken: string, serverId: string, targetUserId: string) {
  return serviceRequest(base(), `/servers/${serverId}/members/${targetUserId}/promote`, { method: 'POST', userToken });
}

export function demoteMember(userToken: string, serverId: string, targetUserId: string) {
  return serviceRequest(base(), `/servers/${serverId}/members/${targetUserId}/demote`, { method: 'POST', userToken });
}

export function banMember(userToken: string, serverId: string, targetUserId: string, body: Record<string, unknown>) {
  return serviceRequest(base(), `/servers/${serverId}/members/${targetUserId}/ban`, { method: 'POST', userToken, body });
}
