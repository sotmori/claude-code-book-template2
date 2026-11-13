import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '@/auth/auth-provider';
import { isExplicitlySignedOut, setExplicitlySignedOut } from '@/auth/app-session';
import { launchThroughPortal } from '@/auth/app-runtime';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const signedOut = !import.meta.env.DEV && isExplicitlySignedOut();
  useEffect(() => {
    if (!import.meta.env.DEV && !loading && !isAuthenticated && !signedOut) {
      void launchThroughPortal().catch(() => setError(true));
    }
  }, [loading, isAuthenticated, attempt, signedOut]);

  if (import.meta.env.DEV && !loading && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!loading && !isAuthenticated && signedOut) {
    return <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">ログアウトしました</h1>
      <p className="text-sm text-foreground-secondary">このアプリからログアウトしました。</p>
      <button type="button" className="rounded-lg bg-primary px-6 py-3 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary" onClick={() => {
        setExplicitlySignedOut(false);
        setError(false);
        setAttempt(n => n + 1);
      }}>もう一度ログイン</button>
    </div>;
  }
  if (loading || !isAuthenticated) {
    return <div className="flex h-full flex-col items-center justify-center gap-4" role="status">
      {error ? <>
        <p>ログイン画面に接続できませんでした。</p>
        <button className="rounded bg-primary px-4 py-2 text-white" onClick={() => { setError(false); setAttempt(n => n + 1); }}>再試行</button>
      </> : <><LoaderCircle size={32} className="animate-spin text-primary" /><span>ログインを確認しています…</span></>}
    </div>;
  }
  return <>{children}</>;
}
