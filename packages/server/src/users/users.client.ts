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
