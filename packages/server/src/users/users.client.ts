import { serviceRequest } from '../shared/serviceClient.js';
import { config } from '../config/index.js';

export function getMe(userId: string) {
  return serviceRequest(config.usersServiceUrl, '/users/me', { userId });
}

export function patchMe(userId: string, body: Record<string, unknown>) {
  return serviceRequest(config.usersServiceUrl, '/users/me', { method: 'PATCH', userId, body });
}

export function getUser(userId: string, targetId: string) {
  return serviceRequest(config.usersServiceUrl, `/users/${targetId}`, { userId });
}

export function getUsersBatch(userId: string, ids: string[]) {
  return serviceRequest(config.usersServiceUrl, '/users/batch', {
    userId,
    method: 'POST',
    body: { ids },
  });
}

export function getBlockedIds(userId: string) {
  return serviceRequest(config.usersServiceUrl, '/users/me/blocks', { userId });
}

export function blockUser(userId: string, targetId: string) {
  return serviceRequest(config.usersServiceUrl, `/users/me/blocks/${targetId}`, { method: 'POST', userId });
}

export function unblockUser(userId: string, targetId: string) {
  return serviceRequest(config.usersServiceUrl, `/users/me/blocks/${targetId}`, { method: 'DELETE', userId });
}

export async function isBlockedBidirectional(userId: string, otherUserId: string): Promise<boolean> {
  const [aResult, bResult] = await Promise.all([
    getBlockedIds(userId),
    getBlockedIds(otherUserId),
  ]);

  const aBlocked = (aResult.data as { blockedIds?: string[] } | null)?.blockedIds ?? [];
  const bBlocked = (bResult.data as { blockedIds?: string[] } | null)?.blockedIds ?? [];

  return aBlocked.includes(otherUserId) || bBlocked.includes(userId);
}
