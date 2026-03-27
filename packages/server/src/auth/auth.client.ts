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

export function logoutUser(body: { refreshToken: string }) {
  return serviceRequest(config.usersServiceUrl, '/auth/logout', { method: 'POST', body });
}

export function verifyEmail(body: { code: string }, userId: string) {
  return serviceRequest(config.usersServiceUrl, '/auth/verify-email', { method: 'POST', body, userId });
}

export function resendVerification(userId: string) {
  return serviceRequest(config.usersServiceUrl, '/auth/resend-verification', { method: 'POST', body: {}, userId });
}
