import { post } from "./client";
import type {
  AuthResponse,
  RefreshResponse,
  RegisterRequest,
  LoginRequest,
  VerifyEmailRequest,
  VerifyEmailResponse,
  ResendVerificationResponse,
} from "../types/api.types";

export function register(data: RegisterRequest) {
  return post<AuthResponse>("/auth/register", data);
}

export function login(data: LoginRequest) {
  return post<AuthResponse>("/auth/login", data);
}

export function refresh(refreshToken: string) {
  return post<RefreshResponse>("/auth/refresh", { refreshToken });
}

export function verifyEmail(data: VerifyEmailRequest) {
  return post<VerifyEmailResponse>("/auth/verify-email", data);
}

export function resendVerification() {
  return post<ResendVerificationResponse>("/auth/resend-verification");
}
