import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import type { LoginApiResponse, LoginResponse, MfaMethod } from './auth-types';
import { api, SESSION_EXPIRED_EVENT, TOKEN_REFRESHED_EVENT } from './auth-service';
import { clearSession, getDevRefreshToken, getAppContext, getToken, setSession } from './app-session';

export function getDevelopmentAppId(): string {
  const appId = import.meta.env.VITE_APP_ID;
  if (!appId) throw new Error('Set VITE_APP_ID before signing in locally');
  return appId;
}

export async function login(email: string, password: string): Promise<LoginApiResponse> {
  const { data } = await api.post<LoginApiResponse>('/auth/login', { email, password, appId: getDevelopmentAppId() }, {
    headers: { 'X-Valance-Client-Capabilities': 'passkey-login-v1' },
  });
  return data;
}

export async function verifyTwoFactor(
  loginChallengeId: string,
  code: string,
  method: MfaMethod = 'email',
): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login/verify-2fa', {
    loginChallengeId,
    code,
    method,
  }, { headers: { 'X-Valance-Client-Capabilities': 'passkey-login-v1' } });
  return data;
}

export async function refreshToken(token: string): Promise<{ token: string }> {
  const { data } = await api.post<{ token: string }>('/auth/refresh', { refreshToken: token });
  return data;
}

// Endpoints that must never trigger a refresh-and-retry: a 401 from
// /auth/refresh means the refresh token itself is dead, and a 401 from
// /auth/login* is just a normal bad-credentials response, not an expired
// session.
const REFRESH_EXEMPT_PATHS = new Set(['/auth/login', '/auth/login/verify-2fa', '/auth/refresh']);

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// Shared in-flight refresh so concurrent 401s (e.g. several requests firing
// at once when the token expires) collapse into a single /auth/refresh call.
let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const storedRefreshToken = getDevRefreshToken();
      if (!storedRefreshToken) {
        throw new Error('No refresh token available');
      }
      const { token } = await refreshToken(storedRefreshToken);
      if (getDevRefreshToken() !== storedRefreshToken) {
        throw new Error('Session changed while refreshing');
      }
      const context = getAppContext();
      if (!context) throw new Error('Missing storage identity');
      setSession(token, context.appId, context);
      window.dispatchEvent(new CustomEvent(TOKEN_REFRESHED_EVENT, { detail: { token } }));
      return token;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// Silently refreshes an expired access token and retries the failed request
// once. Only surfaces as a session expiry when the refresh token itself is
// no longer valid — otherwise this is invisible to the caller.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as RetryableConfig | undefined;
    if (
      !originalRequest ||
      originalRequest._retry ||
      REFRESH_EXEMPT_PATHS.has(originalRequest.url ?? '')
    ) {
      return Promise.reject(error);
    }

    const failedToken = originalRequest.headers.get('Authorization');
    const current = getToken();
    if (!current || !failedToken) return Promise.reject(error);
    originalRequest._retry = true;
    // Another request may already have refreshed this document's same identity.
    if (failedToken !== `Bearer ${current}`) {
      originalRequest.headers.set('Authorization', `Bearer ${current}`);
      return api(originalRequest);
    }

    try {
      const newToken = await refreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch {
      if (getToken() && failedToken === `Bearer ${getToken()}`) {
        clearSession();
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      }
      return Promise.reject(error);
    }
  },
);
