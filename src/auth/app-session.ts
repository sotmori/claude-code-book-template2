/** Shared with the same-origin listing launcher. Never read legacy credentials. */
export const TOKEN_KEY = 'valance.app.token';
export const CONTEXT_KEY = 'valance.app.context';
export const RETURN_LOCATION_KEY = 'valance.app.returnLocation';
export const DEV_REFRESH_KEY = 'valance.app.devRefresh';
/** Written only when this tab redeemed its own hand-off as an un-framed listing bundle. */
export const TOP_LEVEL_LISTING_KEY = 'valance.app.topLevelListing';

const LISTING_PATH = /^\/marketplace\/[^/]+\//;
function unframedListing(): string | null {
  return window.top === window ? LISTING_PATH.exec(window.location.pathname)?.[0] ?? null : null;
}
function topLevelBinding(listing: string, token: string): string {
  return JSON.stringify([listing, token]);
}

/**
 * Cloud app and listing hosts give each app its own HTTPS origin. The offline
 * appliance serves every app on one apps origin, recognisable by plain HTTP, an
 * explicit port, a visible /customapps/ path or an un-framed listing bundle
 * (local development servers look the same and are treated the same way).
 */
export function sharedOrigin(): boolean {
  const { protocol, port, pathname } = window.location;
  return protocol !== 'https:' || port !== '' || pathname.startsWith('/customapps/') || unframedListing() !== null;
}

export interface AppContext {
  appId: string;
  tenantId: string;
  principalId: string;
}

// A running document must never acquire another identity's credentials while it
// still holds business data or pending writes in memory. A new scope needs a reload.
let memoryToken: string | null = null;
let memoryContext: AppContext | null = null;
let devRefresh: string | null = null;
let topLevelBindingValue: string | null = null;
let documentScope: string | undefined;
let reloadRequested = false;
function identityKey(context: AppContext): string {
  return JSON.stringify([context.tenantId, context.appId, context.principalId]);
}
function acceptsDocumentScope(context: AppContext): boolean {
  const scope = identityKey(context);
  if (documentScope === undefined) documentScope = scope;
  if (documentScope === scope) return true;
  if (!reloadRequested) {
    reloadRequested = true;
    window.location.reload();
  }
  return false;
}

export function getToken(): string | null {
  if (!memoryToken || !memoryContext) return null;
  const listing = unframedListing();
  if (listing && topLevelBindingValue !== topLevelBinding(listing, memoryToken)) return null;
  return acceptsDocumentScope(memoryContext) ? memoryToken : null;
}

export function tokenClaims(token: string): Record<string, unknown> {
  const encoded = token.split('.')[1];
  const bytes = Uint8Array.from(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
}

export function retireLegacyCredentials(): void {
  [TOKEN_KEY, CONTEXT_KEY, DEV_REFRESH_KEY, TOP_LEVEL_LISTING_KEY].forEach(key => sessionStorage.removeItem(key));
  // On a shared apps origin these keys belong to older-template apps' own logins.
  if (sharedOrigin()) return;
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
}

/** After redeeming a hand-off: lets an un-framed listing bundle use exactly this token. */
export function bindTopLevelListing(token: string): void {
  const listing = unframedListing();
  topLevelBindingValue = listing ? topLevelBinding(listing, token) : null;
}

export function setSession(token: string, appId: string, developmentIdentity?: { tenantId: string; principalId: string }): void {
  const claims = tokenClaims(token);
  if (import.meta.env.DEV && developmentIdentity) {
    claims.tenantId = developmentIdentity.tenantId;
    claims.principalId = developmentIdentity.principalId;
  }
  if (!appId || appId === '_self' || typeof claims.tenantId !== 'string' ||
      typeof claims.principalId !== 'string' || !claims.tenantId || !claims.principalId) {
    throw new Error('The app session has no storage identity');
  }
  const context: AppContext = { appId, tenantId: claims.tenantId, principalId: claims.principalId };
  memoryContext = context;
  memoryToken = token;
  retireLegacyCredentials();
  if (!acceptsDocumentScope(context)) {
    throw new Error('App identity changed; reloading before exposing the new credential');
  }
}

export function getAppContext(): AppContext | null {
  const token = getToken();
  const value = memoryContext;
  if (!token || !value) return null;
  try {
    const context = value;
    const claims = tokenClaims(token);
    if (!context.appId || context.appId === '_self' || !context.tenantId || !context.principalId ||
        (!import.meta.env.DEV && (context.tenantId !== claims.tenantId || context.principalId !== claims.principalId))) return null;
    return context;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  memoryToken = null;
  memoryContext = null;
  devRefresh = null;
  topLevelBindingValue = null;
  if (window.parent !== window) window.parent.postMessage({ type: "valance:session-clear" }, window.location.origin);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(CONTEXT_KEY);
  sessionStorage.removeItem(DEV_REFRESH_KEY);
  sessionStorage.removeItem(TOP_LEVEL_LISTING_KEY);
  retireLegacyCredentials();
}

// Scoped to this app even on appliances where apps share an origin. Survives a
// reload in this tab, but never signs the user out of their portal or other apps.
function signedOutKey(): string {
  const scope = /^\/(?:customapps\/[^/]+\/[^/]+|marketplace\/[^/]+)\//.exec(window.location.pathname)?.[0] ?? '/';
  return `valance.app.signedOut:${scope}`;
}
export function isExplicitlySignedOut(): boolean {
  return sessionStorage.getItem(signedOutKey()) === '1';
}
export function setExplicitlySignedOut(value: boolean): void {
  if (value) sessionStorage.setItem(signedOutKey(), '1');
  else sessionStorage.removeItem(signedOutKey());
}

export function getDevRefreshToken(): string | null { return devRefresh; }
export function setDevRefreshToken(value: string): void { devRefresh = value; }

/** The launcher shares credentials only with its exact same-origin bundle frame. */
export async function receiveLauncherSession(): Promise<void> {
  if (window.parent === window) return;
  const nonce = String(Math.random()) + String(Date.now());
  await new Promise<void>(resolve => {
    const finish = () => { window.removeEventListener('message', receive); clearTimeout(timeout); resolve(); };
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent || event.origin !== window.location.origin ||
          event.data?.type !== 'valance:session' || event.data?.nonce !== nonce) return;
      try { setSession(event.data.token, event.data.appId); } catch { /* Invalid launcher response stays unauthenticated. */ } finally { finish(); }
    };
    const timeout = setTimeout(finish, 1500);
    window.addEventListener('message', receive);
    window.parent.postMessage({ type: 'valance:session-request', nonce }, window.location.origin);
  });
}
