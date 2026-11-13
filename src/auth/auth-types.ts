export interface User {
  appId?: string;
  principalId?: string;
  email?: string;
  displayName?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  isGuest?: boolean;
  role: string;
  tenantId: string;
  companyName?: string;
  company?: {
    name: string;
    industry?: string;
    logo?: string;
    statistics?: {
      users: number;
      chats: number;
      files: number;
    };
  };
  actions: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export type MfaMethod = 'email' | 'totp';

interface MfaChallengeBase {
  requiresTwoFactor: true;
  loginChallengeId: string;
  expiresInSeconds: number;
}

export type MfaChallengeResponse = MfaChallengeBase & (
  | { challengeName: 'EMAIL_OTP'; delivery: string; destinationMasked: string; mfa?: { method: 'email' } }
  | { challengeName: 'TOTP'; mfa: { method: 'totp' }; delivery?: never; destinationMasked?: never }
);

export type LoginApiResponse = LoginResponse | MfaChallengeResponse;

export function isMfaChallenge(
  response: LoginApiResponse,
): response is MfaChallengeResponse {
  return 'requiresTwoFactor' in response && response.requiresTwoFactor === true;
}

export function isLoginSuccess(response: LoginApiResponse): response is LoginResponse {
  return 'token' in response;
}

export function getMfaMethod(response: MfaChallengeResponse): MfaMethod {
  if (response.challengeName === 'TOTP' && response.mfa?.method === 'totp') return 'totp';
  if (response.challengeName === 'EMAIL_OTP' && (!response.mfa || response.mfa.method === 'email')) return 'email';
  throw new Error('Unsupported sign-in challenge; use the portal to sign in');
}

export interface MfaChallenge {
  loginChallengeId: string;
  method: MfaMethod;
  destinationMasked?: string;
  expiresInSeconds: number;
  challengeName: 'EMAIL_OTP' | 'TOTP';
  delivery?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  mfaChallenge: MfaChallenge | null;
}

export type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string; refreshToken: string } }
  | { type: 'MFA_REQUIRED'; payload: MfaChallenge }
  | { type: 'CLEAR_MFA' }
  | { type: 'LOGOUT' }
  | { type: 'TOKEN_REFRESHED'; payload: { token: string } };
