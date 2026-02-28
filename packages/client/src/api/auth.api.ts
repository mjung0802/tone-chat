import { post } from './client';
import type { AuthResponse, RefreshResponse, RegisterRequest, LoginRequest } from '../types/api.types';

export function register(data: RegisterRequest) {
  return post<AuthResponse>('/auth/register', data);
}

export function login(data: LoginRequest) {
  return post<AuthResponse>('/auth/login', data);
}

export function refresh(refreshToken: string) {
  return post<RefreshResponse>('/auth/refresh', { refreshToken });
}
