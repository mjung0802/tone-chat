import { serviceRequest } from '../shared/serviceClient.js';
import { config } from '../config/index.js';

export function getMe(userToken: string) {
  return serviceRequest(config.usersServiceUrl, '/users/me', { userToken });
}

export function patchMe(userToken: string, body: Record<string, unknown>) {
  return serviceRequest(config.usersServiceUrl, '/users/me', { method: 'PATCH', userToken, body });
}

export function getUser(userToken: string, targetId: string) {
  return serviceRequest(config.usersServiceUrl, `/users/${targetId}`, { userToken });
}

export function getUsersBatch(userToken: string, ids: string[]) {
  return serviceRequest(config.usersServiceUrl, '/users/batch', {
    userToken,
    method: 'POST',
    body: { ids },
  });
}

export function getBlockedIds(userToken: string) {
  return serviceRequest(config.usersServiceUrl, '/users/me/blocks', { userToken });
}

export function blockUser(userToken: string, targetId: string) {
  return serviceRequest(config.usersServiceUrl, `/users/me/blocks/${targetId}`, { method: 'POST', userToken });
}

export function unblockUser(userToken: string, targetId: string) {
  return serviceRequest(config.usersServiceUrl, `/users/me/blocks/${targetId}`, { method: 'DELETE', userToken });
}

export function getFriends(userToken: string) {
  return serviceRequest(config.usersServiceUrl, '/users/me/friends', { userToken });
}

export function getPendingRequests(userToken: string) {
  return serviceRequest(config.usersServiceUrl, '/users/me/friends/pending', { userToken });
}

export function getFriendshipStatus(userToken: string, targetId: string) {
  return serviceRequest(config.usersServiceUrl, `/users/me/friends/${targetId}/status`, { userToken });
}

export function sendFriendRequest(userToken: string, targetId: string) {
  return serviceRequest(config.usersServiceUrl, `/users/me/friends/${targetId}`, { method: 'POST', userToken });
}

export function acceptFriendRequest(userToken: string, targetId: string) {
  return serviceRequest(config.usersServiceUrl, `/users/me/friends/${targetId}/accept`, { method: 'PATCH', userToken });
}

export function removeFriend(userToken: string, targetId: string) {
  return serviceRequest(config.usersServiceUrl, `/users/me/friends/${targetId}`, { method: 'DELETE', userToken });
}

export async function isBlockedBidirectional(userToken: string, otherUserId: string, userId: string): Promise<boolean> {
  const result = await serviceRequest(config.usersServiceUrl, '/internal/blocks/bidirectional-check', {
    method: 'POST',
    body: { userId, otherUserId },
  });
  return (result.data as { blocked?: boolean } | null)?.blocked ?? false;
}
