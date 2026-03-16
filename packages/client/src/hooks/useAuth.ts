import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as authApi from "../api/auth.api";
import { useAuthStore } from "../stores/authStore";
import { useSocketStore } from "../stores/socketStore";
import type {
  RegisterRequest,
  LoginRequest,
  VerifyEmailRequest,
} from "../types/api.types";

function useAuthSuccess() {
  const setTokens = useAuthStore((s) => s.setTokens);
  const connect = useSocketStore((s) => s.connect);
  const queryClient = useQueryClient();

  return (response: {
    accessToken: string;
    refreshToken: string;
    user: { email_verified: boolean };
  }) => {
    setTokens(
      response.accessToken,
      response.refreshToken,
      response.user.email_verified,
    );
    if (response.user.email_verified) {
      connect(response.accessToken);
    }
    queryClient.clear();
  };
}

export function useLogin() {
  const handleAuthSuccess = useAuthSuccess();

  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: handleAuthSuccess,
  });
}

export function useRegister() {
  const handleAuthSuccess = useAuthSuccess();

  return useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
    onSuccess: handleAuthSuccess,
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

export function useVerifyEmail() {
  const setEmailVerified = useAuthStore((s) => s.setEmailVerified);
  const connect = useSocketStore((s) => s.connect);
  const accessToken = useAuthStore((s) => s.accessToken);

  return useMutation({
    mutationFn: (data: VerifyEmailRequest) => authApi.verifyEmail(data),
    onSuccess: () => {
      setEmailVerified(true);
      if (accessToken) connect(accessToken);
    },
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: () => authApi.resendVerification(),
  });
}
