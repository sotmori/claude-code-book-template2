import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router';
import { Mail, Lock, AlertCircle, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { useAuth } from '@/auth/auth-provider';

export function LoginPage() {
  const { login, isAuthenticated, loading, error, clearError, mfaChallenge } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (mfaChallenge) {
    return <Navigate to="/login/two-factor" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    await login(email, password);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="flex min-h-full flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-12 flex justify-center">
            <img src="./logo_valance.png" alt="Valance Logo" className="h-48" />
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 flex items-center rounded-lg border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger">
              <AlertCircle size={16} className="mr-2 shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-foreground-secondary">
                メールアドレス <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail size={20} className="text-foreground-tertiary" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  placeholder="メールアドレス"
                  className="w-full rounded-lg border border-border-strong py-2 pl-10 pr-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-border-focus"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-foreground-secondary">
                パスワード <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock size={20} className="text-foreground-tertiary" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder="パスワード"
                  className="w-full rounded-lg border border-border-strong py-2 pl-10 pr-10 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-border-focus"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-foreground-disabled hover:text-foreground-secondary"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <LoaderCircle size={16} className="mr-2 animate-spin" />
                    <span>ログイン中...</span>
                  </>
                ) : (
                  'ログイン'
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="my-12 border-t border-border-strong" />

          {/* Footer */}
          <div className="text-center text-sm text-foreground-tertiary">
            &copy; {new Date().getFullYear()} VALANCE株式会社
          </div>
        </div>
      </div>
    </div>
  );
}
