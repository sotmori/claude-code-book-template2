import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search } from 'lucide-react';
import { Button, DataTable, ErrorState, PageHeader, Tabs, TextInput, type DataTableColumn } from '@valance/sdk';
import { errorMessage, queryReports } from '@/expense/api';
import { ReportStatusBadge } from '@/expense/components';
import { formatDateJa, formatYen, STATUS_LABEL, type ExpenseReport, type ReportStatus } from '@/expense/model';
import { useExpenseSession } from '@/expense/session';

const TAB_KEYS: ('all' | ReportStatus)[] = ['all', 'draft', 'submitted', 'rejected', 'approved', 'paid'];

export function MyReportsPage() {
  const session = useExpenseSession();
  const navigate = useNavigate();
  const [reports, setReports] = useState<ExpenseReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | ReportStatus>('all');
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');

  const load = useCallback(async () => {
    setError(null);
    setReports(null);
    try {
      setReports(await queryReports({ ownerUserId: session.principalId || undefined, keyword: appliedKeyword }));
    } catch (e) {
      setError(errorMessage(e, '申請一覧を読み込めませんでした。'));
    }
  }, [session.principalId, appliedKeyword]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 検索条件の変更時に再読み込み
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: reports?.length ?? 0 };
    for (const r of reports ?? []) result[r.data.status] = (result[r.data.status] ?? 0) + 1;
    return result;
  }, [reports]);

  const rows = (reports ?? []).filter(r => tab === 'all' || r.data.status === tab);

  const columns: DataTableColumn<ExpenseReport>[] = [
    { key: 'reportNo', header: '申請番号', sortable: true, sortValue: r => r.data.reportNo, render: r => <span className="whitespace-nowrap tabular-nums">{r.data.reportNo}</span>, width: 'w-52' },
    { key: 'title', header: '件名', sortable: true, sortValue: r => r.data.title, render: r => r.data.title },
    { key: 'periodMonth', header: '対象月', sortable: true, sortValue: r => r.data.periodMonth ?? '', render: r => r.data.periodMonth?.replace('-', '/') ?? '—', width: 'w-24' },
    { key: 'items', header: '明細', align: 'right', render: r => `${r.data.itemCount ?? r.data.items?.length ?? 0}件`, width: 'w-20' },
    { key: 'amount', header: '金額', align: 'right', sortable: true, sortValue: r => r.data.totalAmount ?? 0, render: r => <span className="tabular-nums">{formatYen(r.data.totalAmount)}</span>, width: 'w-32' },
    { key: 'status', header: '状態', render: r => <ReportStatusBadge status={r.data.status} />, width: 'w-40' },
    { key: 'updatedAt', header: '更新日', sortable: true, sortValue: r => r.updatedAt, render: r => formatDateJa(r.updatedAt), width: 'w-28' },
  ];

  return (
    <>
      <PageHeader
        title="自分の申請"
        breadcrumbs={[{ label: 'ホーム', to: '/' }, { label: '自分の申請' }]}
        actions={session.canWrite ? <Button icon={<Plus size={16} />} onClick={() => navigate('/reports/new')}>新規申請</Button> : undefined}
      />
      <form
        className="mb-4 flex flex-wrap items-center gap-2"
        onSubmit={e => { e.preventDefault(); setAppliedKeyword(keyword); }}
      >
        <div className="w-full max-w-sm">
          <TextInput value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="件名で検索" aria-label="件名で検索" />
        </div>
        <Button type="submit" variant="secondary" icon={<Search size={16} />}>検索</Button>
      </form>
      <Tabs
        className="mb-4"
        tabs={TAB_KEYS.map(key => ({ key, label: key === 'all' ? 'すべて' : STATUS_LABEL[key], count: counts[key] ?? 0 }))}
        active={tab}
        onChange={key => setTab(key as 'all' | ReportStatus)}
      />
      {error ? <ErrorState description={error} onRetry={() => void load()} /> : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={r => r.id}
          loading={!reports}
          onRowClick={r => navigate(`/reports/${r.id}`)}
          emptyMessage="該当する申請はありません。"
        />
      )}
    </>
  );
}
