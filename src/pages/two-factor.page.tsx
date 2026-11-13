import { useState, useEffect, type FormEvent } from 'react';
import { Navigate } from 'react-router';
import { ShieldCheck, AlertCircle, LoaderCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/auth/auth-provider';

const OTP_LENGTH = 6;
const EXPIRY_BUFFER_SECONDS = 5;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function TwoFactorPage() {
  const {
    mfaChallenge,
    isAuthenticated,
    loading,
    error,
    verifyTwoFactor,
    cancelTwoFactor,
    clearError,
  } = useAuth();

  const [code, setCode] = useState('');

  // This page mounts with its challenge: cancelling unmounts it, and a new login
  // challenge navigates here again, so the countdown starts from the new expiry.
  const [remainingSeconds, setRemainingSeconds] = useState(
    () => Math.max(0, (mfaChallenge?.expiresInSeconds ?? 0) - EXPIRY_BUFFER_SECONDS),
  );

  useEffect(() => {
    if (remainingSeconds <= 0) return;
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [remainingSeconds]);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!mfaChallenge) {
    return <Navigate to="/login" replace />;
  }

  const isExpired = remainingSeconds <= 0;
  const isAuthenticator = mfaChallenge.method === 'totp';
  const isCodeValid = /^\d{6}$/.test(code);
  const isFormDisabled = loading || isExpired;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isCodeValid) return;
    clearError();
    await verifyTwoFactor(code);
  };

  const handleCodeChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setCode(digitsOnly);
    if (error) clearError();
  };

  const handleBackToLogin = () => {
    cancelTwoFactor();
    setCode('');
  };

  const expiredMessage = isExpired && !error
    ? '認証セッションの有効期限が切れました。ログインからやり直してください。'
    : undefined;
  const displayError = error ?? expiredMessage;

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="flex min-h-full flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-12 flex justify-center">
            <img src="./logo_valance.png" alt="Valance Logo" className="h-48" />
          </div>

          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-lightest text-primary">
                <ShieldCheck size={28} />
              </div>
            </div>
            <h1 className="mb-2 text-2xl font-bold text-foreground">認証コードの入力</h1>
            <p className="text-sm text-foreground-tertiary">
              {isAuthenticator ? '認証アプリに表示される6桁のコードを入力してください。' : (
                <>認証コードを <span className="font-medium text-foreground-secondary">{mfaChallenge.destinationMasked}</span> に送信しました</>
              )}
            </p>
          </div>

          {displayError && (
            <div className="mb-6 flex items-center rounded-lg border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger">
              <AlertCircle size={16} className="mr-2 shrink-0" />
              {displayError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="otp-code" className="mb-1 block text-sm font-medium text-foreground-secondary">
                認証コード <span className="text-danger">*</span>
              </label>
              <input
                id="otp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                disabled={isFormDisabled}
                placeholder="6桁の認証コード"
                maxLength={OTP_LENGTH}
                autoFocus
                className="w-full rounded-lg border border-border-strong px-4 py-2 text-center font-mono text-lg tracking-[0.5em] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-border-focus disabled:cursor-not-allowed disabled:bg-surface-tertiary"
              />
            </div>

            {!isExpired && (
              <div className="text-center text-sm text-foreground-tertiary">
                認証セッションの残り時間: <span className="font-medium text-foreground-secondary">{formatTime(remainingSeconds)}</span>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isFormDisabled || !isCodeValid}
                className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <LoaderCircle size={16} className="mr-2 animate-spin" />
                    <span>確認中...</span>
                  </>
                ) : (
                  '確認'
                )}
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="flex items-center text-sm font-medium text-primary hover:text-primary-hover hover:underline"
              >
                <ArrowLeft size={14} className="mr-1" />
                ログインに戻る
              </button>
            </div>
          </form>

          <div className="my-12 border-t border-border-strong" />

          <div className="text-center text-sm text-foreground-tertiary">
            &copy; {new Date().getFullYear()} VALANCE株式会社
          </div>
        </div>
      </div>
    </div>
  );
}
