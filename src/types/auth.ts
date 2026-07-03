export type UserRole =
  | "CUSTOMER"
  | "ACTOR"
  | "CREATOR"
  | "LOCATION_OWNER"
  | "LOCATION"
  | "ADMIN";

export interface AuthResponse {
  token: string | null;
  role: string;
  availableRoles?: UserRole[];
}

export interface MessageResponse {
  message: string;
}

export type VerifyEmailResponse = MessageResponse | AuthResponse;

export interface RegisterRequest {
  email: string;
  phone: string;
  password: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
  role?: UserRole;
}

export interface ResendVerificationRequest {
  email: string;
  role?: UserRole;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
  role?: UserRole;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}
