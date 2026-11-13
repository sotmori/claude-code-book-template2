import { Routes, Route, Navigate, Outlet } from 'react-router';
import { ClipboardCheck, FileText, House, Plus } from 'lucide-react';
import { AdminShell, ToastProvider, type AdminNavItem } from '@valance/sdk';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/auth/auth-provider';
import { lazy, Suspense } from 'react';
const LoginPage = import.meta.env.DEV ? lazy(() => import('@/pages/login.page').then(m => ({ default: m.LoginPage }))) : null;
const TwoFactorPage = import.meta.env.DEV ? lazy(() => import('@/pages/two-factor.page').then(m => ({ default: m.TwoFactorPage }))) : null;
import { DashboardPage } from '@/pages/dashboard.page';
import { MyReportsPage } from '@/pages/my-reports.page';
import { ReportEditPage } from '@/pages/report-edit.page';
import { ReportDetailPage } from '@/pages/report-detail.page';
import { ApprovalsPage } from '@/pages/approvals.page';
import { ExpenseSessionProvider, useExpenseSession } from '@/expense/session';
// ログイン不要のデモ版（npm run build:demo）でのみ読み込む
const DemoBanner = import.meta.env.VITE_DEMO ? lazy(() => import('@/demo/demo-banner')) : null;

function ShellWithNav() {
  // ヘッダのユーザーチップとログアウトはログイン中ユーザーから描画する（SDK 側にプレースホルダ名は無い）
  const { user, logout } = useAuth();
  const session = useExpenseSession();
  const navItems: AdminNavItem[] = [
    { label: 'ホーム', to: '/', icon: <House size={18} /> },
    { label: '自分の申請', to: '/reports', icon: <FileText size={18} /> },
    ...(session.canWrite ? [{ label: '新規申請', to: '/reports/new', icon: <Plus size={18} /> }] : []),
    ...(session.isApprover ? [{ label: '承認・精算', to: '/approvals', icon: <ClipboardCheck size={18} /> }] : []),
  ];
  return (
    <AdminShell title={DemoBanner ? '経費精算（デモ）' : '経費精算'} user={user} onLogout={DemoBanner ? undefined : logout} navItems={navItems}>
      {DemoBanner && <Suspense fallback={null}><DemoBanner /></Suspense>}
      <Outlet />
    </AdminShell>
  );
}

function ProtectedAppLayout() {
  return (
    <ProtectedRoute>
      <ExpenseSessionProvider>
        <ToastProvider>
          <ShellWithNav />
        </ToastProvider>
      </ExpenseSessionProvider>
    </ProtectedRoute>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      {LoginPage && <Route path="/login" element={<Suspense fallback={null}><LoginPage /></Suspense>} />}
      {TwoFactorPage && <Route path="/login/two-factor" element={<Suspense fallback={null}><TwoFactorPage /></Suspense>} />}
      <Route element={<ProtectedAppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/reports" element={<MyReportsPage />} />
        <Route path="/reports/new" element={<ReportEditPage key="new" />} />
        <Route path="/reports/:id" element={<ReportDetailPage />} />
        <Route path="/reports/:id/edit" element={<ReportEditPage key="edit" />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
