import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/auth/auth-provider';
import { fetchAppRole, type AppRole } from './api';

export interface ExpenseSession {
  /** null = 取得中または権限なし */
  appRole: AppRole | null;
  roleLoading: boolean;
  roleError: boolean;
  /** 申請の作成・更新ができる（編集 以上） */
  canWrite: boolean;
  /** 承認・精算処理ができる（管理） */
  isApprover: boolean;
  principalId: string;
  displayName: string;
  email: string;
  reloadRole: () => void;
}

const SessionContext = createContext<ExpenseSession | null>(null);

export function ExpenseSessionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [appRole, setAppRole] = useState<AppRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [roleError, setRoleError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchAppRole()
      .then(role => { if (!cancelled) { setAppRole(role); setRoleError(false); } })
      .catch(() => { if (!cancelled) setRoleError(true); })
      .finally(() => { if (!cancelled) setRoleLoading(false); });
    return () => { cancelled = true; };
  }, [attempt]);

  const reloadRole = useCallback(() => {
    setRoleLoading(true);
    setAttempt(n => n + 1);
  }, []);

  const value = useMemo<ExpenseSession>(() => {
    const displayName = user?.name || [user?.lastName, user?.firstName].filter(Boolean).join(' ') || user?.email || '利用者';
    return {
      appRole,
      roleLoading,
      roleError,
      canWrite: appRole === 'edit' || appRole === 'manage',
      isApprover: appRole === 'manage',
      principalId: user?.principalId ?? '',
      displayName,
      email: user?.email ?? '',
      reloadRole,
    };
  }, [appRole, roleLoading, roleError, user, reloadRole]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useExpenseSession(): ExpenseSession {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useExpenseSession must be used within ExpenseSessionProvider');
  return context;
}
