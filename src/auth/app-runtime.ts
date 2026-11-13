import { api } from './auth-service';
import { receiveLauncherSession, bindTopLevelListing, clearSession, getAppContext, RETURN_LOCATION_KEY, retireLegacyCredentials, setSession, isExplicitlySignedOut, setExplicitlySignedOut } from './app-session';

export function safeReturnLocation(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return null;
  const url = new URL(value, window.location.origin);
  const listing = /^\/marketplace\/([^/]+)\//.exec(window.location.pathname);
  if (listing && !url.pathname.startsWith(`/marketplace/${listing[1]}/`)) return null;
  return url.origin === window.location.origin ? value : null;
}

/** Call before rendering the router, including on public capability pages. */
export async function bootstrapAppSession(): Promise<void> {
  retireLegacyCredentials();
  const match = /^#vh=([^&]+)$/.exec(window.location.hash);
  if (!match) {
    await receiveLauncherSession();
    // A same-origin launcher may provide its in-memory session to this frame.
    const pending = safeReturnLocation(sessionStorage.getItem(RETURN_LOCATION_KEY));
    if (pending && getAppContext() && window.top !== window) {
      sessionStorage.removeItem(RETURN_LOCATION_KEY);
      window.history.replaceState(null, '', pending);
    }
    return;
  }
  // Remove the secret before any render, request, failure UI or other script can use it.
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  clearSession();
  const { data } = await api.post<{ token: string; appId: string; returnPath: string }>('/auth/handoff', {
    code: decodeURIComponent(match[1]),
  });
  setSession(data.token, data.appId);
  bindTopLevelListing(data.token);
  setExplicitlySignedOut(false);
  const destination = safeReturnLocation(sessionStorage.getItem(RETURN_LOCATION_KEY)) ??
    safeReturnLocation(data.returnPath) ?? '/';
  sessionStorage.removeItem(RETURN_LOCATION_KEY);
  window.history.replaceState(null, '', destination);
}

let launchPromise: Promise<void> | undefined;
export function launchThroughPortal(): Promise<void> {
  if (isExplicitlySignedOut()) return Promise.resolve();
  if (launchPromise) return launchPromise;
  launchPromise = (async () => {
    const location = window.location;
    const pending = safeReturnLocation(sessionStorage.getItem(RETURN_LOCATION_KEY)) ??
      location.pathname + location.search + location.hash;
    sessionStorage.setItem(RETURN_LOCATION_KEY, pending);
    clearSession();
    const { data } = await api.get<{ url: string }>('/auth/portal-launch', {
      params: { path: new URL(pending, location.origin).pathname },
    });
    const url = new URL(data.url);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
      throw new Error('Invalid portal URL');
    }
    (window.top ?? window).location.replace(url.href);
  })().catch(error => {
    launchPromise = undefined;
    throw error;
  });
  return launchPromise;
}
