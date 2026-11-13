import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { CircleCheck, ClipboardCheck, FilePen, Hourglass, Plus, Wallet } from 'lucide-react';
import { Alert, Button, DataTable, ErrorState, KpiCard, PageHeader, type DataTableColumn } from '@valance/sdk';
import { getAppId } from '@/lib/app-id';
import { errorMessage, queryReports } from '@/expense/api';
import { ReportStatusBadge } from '@/expense/components';
import { currentMonth, formatDateJa, formatYen, type ExpenseReport } from '@/expense/model';
import { useExpenseSession } from '@/expense/session';

interface Summary {
  mine: ExpenseReport[];
  pendingApproval: ExpenseReport[] | null;
  awaitingPayment: ExpenseReport[] | null;
}

export function DashboardPage() {
  const session = useExpenseSession();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const mine = await queryReports({ ownerUserId: session.principalId || undefined });
      let pendingApproval: ExpenseReport[] | null = null;
      let awaitingPayment: ExpenseReport[] | null = null;
      if (session.isApprover) {
        [pendingApproval, awaitingPayment] = await Promise.all([
          queryReports({ statuses: ['submitted'] }),
          queryReports({ statuses: ['approved'] }),
        ]);
      }
      setSummary({ mine, pendingApproval, awaitingPayment });
    } catch (e) {
      setError(errorMessage(e, 'データを読み込めませんでした。'));
    }
  }, [session.principalId, session.isApprover]);

  useEffect(() => {
    if (session.roleLoading) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 画面表示時の初回読み込み
    void load();
  }, [load, session.roleLoading]);

  const mine = summary?.mine ?? [];
  const month = currentMonth();
  const drafts = mine.filter(r => r.data.status === 'draft' || r.data.status === 'rejected');
  const inReview = mine.filter(r => r.data.status === 'submitted');
  const paidThisMonth = mine.filter(r => r.data.status === 'paid' && (r.data.paidAt ?? '').startsWith(month));
  const unpaidAmount = mine.filter(r => r.data.status === 'submitted' || r.data.status === 'approved')
    .reduce((t, r) => t + (r.data.totalAmount ?? 0), 0);

  const columns: DataTableColumn<ExpenseReport>[] = [
    { key: 'reportNo', header: '申請番号', render: r => <span className="whitespace-nowrap tabular-nums">{r.data.reportNo}</span>, width: 'w-52' },
    { key: 'title', header: '件名', render: r => r.data.title },
    { key: 'status', header: '状態', render: r => <ReportStatusBadge status={r.data.status} />, width: 'w-40' },
    { key: 'amount', header: '金額', align: 'right', render: r => <span className="tabular-nums">{formatYen(r.data.totalAmount)}</span>, width: 'w-32' },
    { key: 'updatedAt', header: '更新日', render: r => formatDateJa(r.updatedAt), width: 'w-28' },
  ];

  return (
    <>
      <PageHeader
        title="ホーム"
        description={`${session.displayName} さんの経費精算の状況です。`}
        actions={session.canWrite ? <Button icon={<Plus size={16} />} onClick={() => navigate('/reports/new')}>新規申請</Button> : undefined}
      />
      {!session.roleLoading && session.appRole === 'view' && (
        <div className="mb-4">
          <Alert tone="info" title="閲覧のみの権限です">申請を作成するには、アプリ管理者に「編集」以上の権限を依頼してください。</Alert>
        </div>
      )}
      {error ? <ErrorState description={error} onRetry={() => void load()} /> : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="下書き・差戻し" value={summary ? drafts.length : '—'} unit="件" icon={<FilePen size={18} />} />
            <KpiCard label="承認待ち（自分の申請）" value={summary ? inReview.length : '—'} unit="件" icon={<Hourglass size={18} />} />
            <KpiCard label="未精算の申請額" value={summary ? formatYen(unpaidAmount) : '—'} icon={<Wallet size={18} />} />
            <KpiCard label="今月の精算済額" value={summary ? formatYen(paidThisMonth.reduce((t, r) => t + (r.data.totalAmount ?? 0), 0)) : '—'} icon={<CircleCheck size={18} />} />
          </div>

          {session.isApprover && (
            <section className="mt-6 rounded-md border border-border-strong/60 bg-surface p-5 shadow-1">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ClipboardCheck size={22} className="text-primary" aria-hidden="true" />
                  <div>
                    <h2 className="font-semibold">承認・精算業務</h2>
                    <p className="text-sm text-foreground-secondary">
                      承認待ち {summary?.pendingApproval?.length ?? '—'} 件 ／ 支払待ち {summary?.awaitingPayment?.length ?? '—'} 件
                      （{formatYen((summary?.awaitingPayment ?? []).reduce((t, r) => t + (r.data.totalAmount ?? 0), 0))}）
                    </p>
                  </div>
                </div>
                <Link to="/approvals" className="text-sm font-medium text-primary underline-offset-4 hover:underline">承認・精算画面へ</Link>
              </div>
            </section>
          )}

          <section className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold">最近の申請</h2>
              <Link to="/reports" className="text-sm text-primary underline-offset-4 hover:underline">すべて表示</Link>
            </div>
            <DataTable
              columns={columns}
              rows={mine.slice(0, 8)}
              rowKey={r => r.id}
              loading={!summary}
              onRowClick={r => navigate(`/reports/${r.id}`)}
              emptyMessage="まだ申請がありません。「新規申請」から作成できます。"
            />
          </section>
        </>
      )}
      {import.meta.env.DEV && (
        <p className="mt-4 text-center text-xs text-foreground-secondary">Connected app ID: {getAppId()}</p>
      )}
    </>
  );
}
