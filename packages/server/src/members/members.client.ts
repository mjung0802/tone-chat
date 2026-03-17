import { serviceRequest } from '../shared/serviceClient.js';
import { config } from '../config/index.js';

const base = () => config.messagingServiceUrl;

export function joinServer(userId: string, serverId: string) {
  return serviceRequest(base(), `/servers/${serverId}/members`, { method: 'POST', userId });
}

export function listMembers(userId: string, serverId: string) {
  return serviceRequest(base(), `/servers/${serverId}/members`, { userId });
}

export function getMember(userId: string, serverId: string, targetUserId: string) {
  return serviceRequest(base(), `/servers/${serverId}/members/${targetUserId}`, { userId });
}

export function updateMember(userId: string, serverId: string, targetUserId: string, body: Record<string, unknown>) {
  return serviceRequest(base(), `/servers/${serverId}/members/${targetUserId}`, { method: 'PATCH', userId, body });
}

export function removeMember(userId: string, serverId: string, targetUserId: string) {
  return serviceRequest(base(), `/servers/${serverId}/members/${targetUserId}`, { method: 'DELETE', userId });
}

export function muteMember(userId: string, serverId: string, targetUserId: string, body: Record<string, unknown>) {
  return serviceRequest(base(), `/servers/${serverId}/members/${targetUserId}/mute`, { method: 'POST', userId, body });
}

export function unmuteMember(userId: string, serverId: string, targetUserId: string) {
  return serviceRequest(base(), `/servers/${serverId}/members/${targetUserId}/mute`, { method: 'DELETE', userId });
}

export function promoteMember(userId: string, serverId: string, targetUserId: string) {
  return serviceRequest(base(), `/servers/${serverId}/members/${targetUserId}/promote`, { method: 'POST', userId });
}

export function demoteMember(userId: string, serverId: string, targetUserId: string) {
  return serviceRequest(base(), `/servers/${serverId}/members/${targetUserId}/demote`, { method: 'POST', userId });
}

export function banMember(userId: string, serverId: string, targetUserId: string, body: Record<string, unknown>) {
  return serviceRequest(base(), `/servers/${serverId}/members/${targetUserId}/ban`, { method: 'POST', userId, body });
}
