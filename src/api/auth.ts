import api from "./client";
import type {
  AuthResponse,
  MessageResponse,
  VerifyEmailResponse,
  RegisterRequest,
  LoginRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from "../types/auth";

export async function register(payload: RegisterRequest): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/api/auth/register", payload);
  return data;
}

export async function login(payload: LoginRequest): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/api/auth/login", payload);
  return data;
}

export async function verifyEmail(
  payload: VerifyEmailRequest
): Promise<VerifyEmailResponse> {
  const { data } = await api.post<VerifyEmailResponse>(
    "/api/auth/verify-email",
    payload
  );
  return data;
}

export async function resendVerification(
  payload: ResendVerificationRequest
): Promise<MessageResponse> {
  const { data } = await api.post<MessageResponse>(
    "/api/auth/resend-verification",
    payload
  );
  return data;
}

export async function forgotPassword(
  payload: ForgotPasswordRequest
): Promise<MessageResponse> {
  const { data } = await api.post<MessageResponse>(
    "/api/auth/forgot-password",
    payload
  );
  return data;
}

export async function resetPassword(
  payload: ResetPasswordRequest
): Promise<MessageResponse> {
  const { data } = await api.post<MessageResponse>(
    "/api/auth/reset-password",
    payload
  );
  return data;
}
