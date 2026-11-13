import axios from 'axios';
import type { User } from './auth-types';
import { clearSession, getToken } from './app-session';

export const api = axios.create({ baseURL: '/v1', headers: { 'Content-Type': 'application/json' } });
export const SESSION_EXPIRED_EVENT = 'auth:session-expired';
export const TOKEN_REFRESHED_EVENT = 'auth:token-refreshed';

export async function getProfile(token: string): Promise<User> {
  const { data } = await api.get<User>('/auth/profile', { headers: { Authorization: `Bearer ${token}` } });
  return { ...data, name: data.name || data.displayName || data.fullName || '' };
}

const PUBLIC_PATHS = new Set(['/auth/handoff', '/auth/portal-launch']);
if (import.meta.env.DEV) {
  ['/auth/login', '/auth/login/verify-2fa', '/auth/refresh'].forEach(path => PUBLIC_PATHS.add(path));
}
function isPublicRequest(url = ''): boolean {
  const path = new URL(url, window.location.origin).pathname.replace(/^\/v1(?=\/)/, '');
  return path.startsWith('/public/') || PUBLIC_PATHS.has(path);
}

// The app session belongs to this origin's /v1 only. An absolute URL (a presigned
// file URL, an external link) must never receive it, even through this instance.
function isSameOriginRequest(baseURL = '', url = ''): boolean {
  const target = /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url) ? url : `${baseURL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
  return new URL(target, window.location.origin).origin === window.location.origin;
}

api.interceptors.request.use(config => {
  if (!isSameOriginRequest(config.baseURL, config.url) || isPublicRequest(config.url)) {
    config.headers.delete('Authorization');
    return config;
  }
  const token = getToken();
  const supplied = config.headers.get('Authorization');
  if (import.meta.env.PROD && supplied && (!token || supplied !== `Bearer ${token}`)) {
    throw new Error('The app session changed before submission');
  }
  if (token && !supplied) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

if (import.meta.env.PROD) {
  api.interceptors.response.use(response => response, async (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && !isPublicRequest(error.config?.url)) {
      const sent = error.config?.headers.get('Authorization');
      const current = getToken();
      // A delayed response from an old document/request must not erase a new
      // hand-off or login that was installed while the request was in flight.
      if (current && sent === `Bearer ${current}`) {
        clearSession();
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      }
      // ProtectedRoute owns navigation; public pages never force a portal login.
    }
    return Promise.reject(error);
  });
}
