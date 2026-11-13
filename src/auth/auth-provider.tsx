import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { AuthContext } from './auth-context';
import { api, getProfile, SESSION_EXPIRED_EVENT } from './auth-service';
import { clearSession, getAppContext, getToken, setSession, setExplicitlySignedOut } from './app-session';
import type { User } from './auth-types';
export { useAuth } from './auth-context';

const DevAuthProvider = import.meta.env.DEV ? lazy(() => import('./dev-auth-provider')) : null;

function ProductionAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const expired = () => { setUser(null); setLoading(false); };
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    async function restoreProfile(): Promise<void> {
      const token = getToken();
      if (!token || !getAppContext()) { if (active) setLoading(false); return; }
      try {
        const profile = await getProfile(token);
        if (!active) return;
        if (getToken() !== token) { await restoreProfile(); return; }
        const appId = profile.appId ?? getAppContext()?.appId;
        if (!appId) throw new Error('Missing installed app');
        setSession(token, appId);
        setUser(profile);
        setLoading(false);
      } catch {
        if (!active) return;
        if (getToken() !== token) { await restoreProfile(); return; }
        clearSession();
        setUser(null);
        setLoading(false);
      }
    }
    void restoreProfile();
    return () => { active = false; window.removeEventListener(SESSION_EXPIRED_EVENT, expired); };
  }, []);

  const logout = async () => {
    const token = getToken();
    if (!token) return;
    setExplicitlySignedOut(true);
    try { await api.post('/auth/logout', undefined, { headers: { Authorization: `Bearer ${token}` } }); }
    catch {
      if (getToken() === token) {
        setExplicitlySignedOut(false);
        setError('ログアウトできませんでした。もう一度お試しください。');
      }
      return;
    }
    if (getToken() !== token) return;
    clearSession();
    setUser(null);
  };
  return <AuthContext.Provider value={{
    user, token: getToken(), refreshToken: null, loading, error, mfaChallenge: null,
    isAuthenticated: !!user && !!getToken(), logout, clearError: () => setError(null),
    login: async () => { throw new Error('Use the portal to sign in'); },
    verifyTwoFactor: async () => { throw new Error('Use the portal to sign in'); },
    cancelTwoFactor: () => { setError(null); },
  }}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return DevAuthProvider
    ? <Suspense fallback={null}><DevAuthProvider>{children}</DevAuthProvider></Suspense>
    : <ProductionAuthProvider>{children}</ProductionAuthProvider>;
}
