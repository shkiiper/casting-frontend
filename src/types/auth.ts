export interface AuthResponse {
  token: string | null;
  role: string; // backend возвращает role.name()
}

export interface MessageResponse {
  message: string;
}

export type VerifyEmailResponse = MessageResponse | AuthResponse;

export interface RegisterRequest {
  email: string;
  phone: string;
  password: string;
  role: "CUSTOMER" | "ACTOR" | "CREATOR" | "LOCATION_OWNER" | "ADMIN";
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}
