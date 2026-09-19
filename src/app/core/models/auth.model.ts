import { User } from './user.model';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  name: string;
  email: string;
  password: string;
}

export interface PasswordRecoveryRequest {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export interface VerifyEmailPayload {
  token: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface AuthSession {
  user: User;
  tokens: AuthTokens;
}

export const AUTH_STORAGE_KEYS = {
  accessToken: 'maiawall_access_token',
  refreshToken: 'maiawall_refresh_token',
} as const;