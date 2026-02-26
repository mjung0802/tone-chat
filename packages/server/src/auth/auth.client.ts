import { serviceRequest } from '../shared/serviceClient.js';
import { config } from '../config/index.js';

export function registerUser(body: { username: string; email: string; password: string }) {
  return serviceRequest(config.usersServiceUrl, '/auth/register', { method: 'POST', body });
}

export function loginUser(body: { email: string; password: string }) {
  return serviceRequest(config.usersServiceUrl, '/auth/login', { method: 'POST', body });
}

export function refreshToken(body: { refreshToken: string }) {
  return serviceRequest(config.usersServiceUrl, '/auth/refresh', { method: 'POST', body });
}
