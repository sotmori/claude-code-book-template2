import { createContext, useContext } from 'react';
import type { AuthState } from './auth-types';

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  verifyTwoFactor: (code: string) => Promise<void>;
  cancelTwoFactor: () => void;
  logout: () => void;
  clearError: () => void;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
