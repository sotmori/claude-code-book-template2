import { useReducer, useEffect, useCallback, type ReactNode } from 'react';
import type { AuthState, AuthAction, MfaChallenge, User } from './auth-types';
import { getMfaMethod, isMfaChallenge, isLoginSuccess } from './auth-types';
import * as authService from './dev-auth-service';
import { api, getProfile, SESSION_EXPIRED_EVENT, TOKEN_REFRESHED_EVENT } from './auth-service';
import { AuthContext, type AuthContextValue } from './auth-context';
import { clearSession, getDevRefreshToken, setDevRefreshToken, getToken, setSession } from './app-session';
import axios from 'axios';

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  loading: true,
  error: null,
  mfaChallenge: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        loading: false,
        error: null,
        mfaChallenge: null,
      };
    case 'MFA_REQUIRED':
      return {
        ...state,
        loading: false,
        error: null,
        mfaChallenge: action.payload,
      };
    case 'CLEAR_MFA':
      return { ...state, mfaChallenge: null, error: null };
    case 'LOGOUT':
      return { ...initialState, loading: false };
    case 'TOKEN_REFRESHED':
      return { ...state, token: action.payload.token };
    default:
      return state;
  }
}

// The development login routes answer errors as top-level `{code, message}`.
// Decide on `code`; the Japanese `message` is display text and may change.
function authError(error: unknown): { status?: number; code?: string; message?: string } | null {
  if (!axios.isAxiosError(error)) return null;
  const data = error.response?.data as { code?: unknown; message?: unknown } | undefined;
  return {
    status: error.response?.status,
    code: typeof data?.code === 'string' ? data.code : undefined,
    message: typeof data?.message === 'string' ? data.message : undefined,
  };
}

export function getLoginErrorMessage(error: unknown): string {
  const failure = authError(error);
  if (!failure) return '予期しないエラーが発生しました';
  if (failure.status === undefined) {
    return 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
  }
  if (failure.code === 'PASSKEY_REQUIRED' || failure.code === 'SIGN_IN_METHOD_SETUP_REQUIRED' || failure.code === 'USE_PORTAL_SECURITY_SETTINGS') {
    return 'ポータルで必要なサインイン方法を設定し、ポータルからアプリを開いてください。';
  }
  if (failure.code === 'CLIENT_UPGRADE_REQUIRED') {
    return '開発用テンプレートを最新版に更新するか、ポータルからアプリを開いてください。';
  }
  if (failure.code === 'ERR_401001' || (failure.status === 401 && !failure.message)) {
    return 'メールアドレスまたはパスワードが正しくありません';
  }
  if (failure.status < 500 && failure.message) return failure.message;
  return 'サーバーエラーが発生しました。しばらくしてから再試行してください';
}

export function getOtpErrorMessage(error: unknown): string {
  const failure = authError(error);
  if (!failure) return '予期しないエラーが発生しました';
  if (failure.status === undefined) {
    return 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
  }
  if (failure.status === 429) {
    return '認証の試行回数が上限に達しました。再度ログインしてください。';
  }
  if (failure.code === 'CHALLENGE_EXPIRED' || failure.code === 'LOGIN_RETRY_REQUIRED') {
    return '認証セッションの有効期限が切れています。再度ログインしてください。';
  }
  if (failure.code === 'INVALID_CODE') {
    return '認証コードが無効か、有効期限が切れています。';
  }
  if (failure.code === 'TOTP_CODE_ALREADY_USED') {
    return 'この認証コードは使用済みです。認証アプリに次のコードが表示されてから入力してください。';
  }
  if (failure.status < 500 && failure.message) return failure.message;
  return '認証に失敗しました。しばらくしてから再試行してください';
}

export default function DevAuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const token = getToken();
    const refreshTokenValue = getDevRefreshToken();

    if (!token) {
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

    getProfile(token)
      .then((user: User) => {
        const currentToken = getToken();
        if (!currentToken || getDevRefreshToken() !== refreshTokenValue) return;
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user, token: currentToken, refreshToken: refreshTokenValue ?? '' },
        });
      })
      .catch(() => {
        if (getDevRefreshToken() !== refreshTokenValue) return;
        clearSession();
        dispatch({ type: 'LOGOUT' });
      });
  }, []);

  // Bridges the axios interceptor in auth-service.ts (which lives outside
  // React) back into this reducer: it silently refreshes the access token on
  // a 401 and only gives up when the refresh token itself is dead.
  useEffect(() => {
    const handleTokenRefreshed = (event: Event) => {
      const { token } = (event as CustomEvent<{ token: string }>).detail;
      dispatch({ type: 'TOKEN_REFRESHED', payload: { token } });
    };
    const handleSessionExpired = () => dispatch({ type: 'LOGOUT' });

    window.addEventListener(TOKEN_REFRESHED_EVENT, handleTokenRefreshed);
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => {
      window.removeEventListener(TOKEN_REFRESHED_EVENT, handleTokenRefreshed);
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await authService.login(email, password);

      if (isMfaChallenge(response)) {
        const challenge: MfaChallenge = {
          loginChallengeId: response.loginChallengeId,
          method: getMfaMethod(response),
          destinationMasked: response.destinationMasked,
          expiresInSeconds: response.expiresInSeconds,
          challengeName: response.challengeName,
          delivery: response.delivery,
        };
        dispatch({ type: 'MFA_REQUIRED', payload: challenge });
        return;
      }

      if (isLoginSuccess(response)) {
        if (!response.user.principalId) throw new Error('Missing storage principal');
        setSession(response.token, authService.getDevelopmentAppId(), { tenantId: response.user.tenantId, principalId: response.user.principalId });
        setDevRefreshToken(response.refreshToken);
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user: response.user,
            token: response.token,
            refreshToken: response.refreshToken,
          },
        });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: getLoginErrorMessage(error) });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const verifyTwoFactor = useCallback(
    async (code: string) => {
      if (!state.mfaChallenge) {
        dispatch({ type: 'SET_ERROR', payload: '認証セッションが見つかりません。再度ログインしてください。' });
        return;
      }
      dispatch({ type: 'SET_ERROR', payload: null });
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const response = await authService.verifyTwoFactor(
          state.mfaChallenge.loginChallengeId,
          code,
          state.mfaChallenge.method,
        );
        if (!response.user.principalId) throw new Error('Missing storage principal');
        setSession(response.token, authService.getDevelopmentAppId(), { tenantId: response.user.tenantId, principalId: response.user.principalId });
        setDevRefreshToken(response.refreshToken);
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user: response.user,
            token: response.token,
            refreshToken: response.refreshToken,
          },
        });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: getOtpErrorMessage(error) });
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [state.mfaChallenge],
  );

  const cancelTwoFactor = useCallback(() => {
    dispatch({ type: 'CLEAR_MFA' });
  }, []);

  const logout = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try { await api.post('/auth/logout', undefined, { headers: { Authorization: `Bearer ${token}` } }); }
    catch {
      dispatch({ type: 'SET_ERROR', payload: 'ログアウトできませんでした。もう一度お試しください。' });
      return;
    }
    if (getToken() !== token) return;
    clearSession();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    verifyTwoFactor,
    cancelTwoFactor,
    logout,
    clearError,
    isAuthenticated: !!state.user && !!state.token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
