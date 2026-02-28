import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as authApi from '../api/auth.api';
import { useAuthStore } from '../stores/authStore';
import { useSocketStore } from '../stores/socketStore';
import type { RegisterRequest, LoginRequest } from '../types/api.types';

export function useLogin() {
  const setTokens = useAuthStore((s) => s.setTokens);
  const connect = useSocketStore((s) => s.connect);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: (response) => {
      setTokens(response.accessToken, response.refreshToken);
      connect(response.accessToken);
      queryClient.clear();
    },
  });
}

export function useRegister() {
  const setTokens = useAuthStore((s) => s.setTokens);
  const connect = useSocketStore((s) => s.connect);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
    onSuccess: (response) => {
      setTokens(response.accessToken, response.refreshToken);
      connect(response.accessToken);
      queryClient.clear();
    },
  });
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const disconnect = useSocketStore((s) => s.disconnect);
  const queryClient = useQueryClient();

  return () => {
    disconnect();
    clearAuth();
    queryClient.clear();
  };
}
