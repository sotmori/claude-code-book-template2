import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Download, Search } from 'lucide-react';
import { Alert, Button, DataTable, ErrorState, PageHeader, Tabs, TextInput, type DataTableColumn } from '@valance/sdk';
import { errorMessage, queryReports } from '@/expense/api';
import { downloadCsv, ReportStatusBadge } from '@/expense/components';
import { formatDateJa, formatDateTimeJa, formatYen, STATUS_LABEL, type ExpenseReport, type ReportStatus } from '@/expense/model';
import { useExpenseSession } from '@/expense/session';

type TabKey = 'submitted' | 'approved' | 'paid' | 'rejected' | 'all';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'submitted', label: '承認待ち' },
  { key: 'approved', label: '支払待ち' },
  { key: 'paid', label: '精算済' },
  { key: 'rejected', label: '差戻し' },
  { key: 'all', label: 'すべて' },
];
/** 承認者の一覧に下書きは出さない */
const VISIBLE: ReportStatus[] = ['submitted', 'approved', 'paid', 'rejected'];

export function ApprovalsPage() {
  const session = useExpenseSession();
  const navigate = useNavigate();
  const [reports, setReports] = useState<ExpenseReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('submitted');
  const [month, setMonth] = useState('');
  const [keyword, setKeyword] = useState('');
  const [applied, setApplied] = useState({ month: '', keyword: '' });

  const load = useCallback(async () => {
    setError(null);
    setReports(null);
    try {
      setReports(await queryReports({ statuses: VISIBLE, periodMonth: applied.month || undefined, keyword: applied.keyword }));
    } catch (e) {
      setError(errorMessage(e, '申請を読み込めませんでした。'));
    }
  }, [applied]);

  useEffect(() => {
    if (!session.isApprover) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 検索条件の変更時に再読み込み
    void load();
  }, [load, session.isApprover]);

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: reports?.length ?? 0 };
    for (const r of reports ?? []) result[r.data.status] = (result[r.data.status] ?? 0) + 1;
    return result;
  }, [reports]);

  if (!session.isApprover) {
    return (
      <>
        <PageHeader title="承認・精算" />
        <Alert tone="warning" title="この画面を利用する権限がありません">承認・精算の操作には、このアプリの「管理」権限が必要です。</Alert>
      </>
    );
  }

  const rows = (reports ?? []).filter(r => tab === 'all' || r.data.status === tab);
  const totalAmount = rows.reduce((t, r) => t + (r.data.totalAmount ?? 0), 0);
  const othersVisible = (reports ?? []).some(r => session.principalId && r.ownerUserId !== session.principalId);

  const exportCsv = () => {
    const header = ['申請番号', '件名', '状態', '申請者', 'メール', '部署', '対象月', '申請日時', '承認者', '承認日時', '精算日', '明細No', '利用日', '科目', '支払先', '内容', '金額'];
    const lines: (string | number)[][] = [header];
    for (const r of rows) {
      const d = r.data;
      const head = [d.reportNo, d.title, STATUS_LABEL[d.status], d.applicantName ?? '', d.applicantEmail ?? '', d.department ?? '', d.periodMonth ?? '',
        formatDateTimeJa(d.submittedAt), d.approverName ?? '', formatDateTimeJa(d.approvedAt), d.paidAt ?? ''];
      (d.items ?? []).forEach((item, index) => {
        lines.push([...head, index + 1, item.date, item.category, item.payee, item.description, item.amount]);
      });
    }
    const label = TABS.find(t => t.key === tab)?.label ?? '';
    downloadCsv(`経費精算_${label}${applied.month ? `_${applied.month}` : ''}.csv`, lines);
  };

  const columns: DataTableColumn<ExpenseReport>[] = [
    { key: 'reportNo', header: '申請番号', sortable: true, sortValue: r => r.data.reportNo, render: r => <span className="whitespace-nowrap tabular-nums">{r.data.reportNo}</span>, width: 'w-52' },
    { key: 'applicant', header: '申請者', sortable: true, filterable: true, sortValue: r => r.data.applicantName ?? '', filterValue: r => r.data.applicantName ?? '', render: r => r.data.applicantName ?? '—', width: 'w-36' },
    { key: 'department', header: '部署', filterable: true, filterValue: r => r.data.department ?? '（未設定）', render: r => r.data.department ?? '—', width: 'w-28' },
    { key: 'title', header: '件名', render: r => r.data.title },
    { key: 'amount', header: '金額', align: 'right', sortable: true, sortValue: r => r.data.totalAmount ?? 0, render: r => <span className="tabular-nums">{formatYen(r.data.totalAmount)}</span>, width: 'w-32' },
    { key: 'submittedAt', header: '申請日', sortable: true, sortValue: r => r.data.submittedAt ?? '', render: r => formatDateJa(r.data.submittedAt), width: 'w-28' },
    { key: 'status', header: '状態', render: r => <ReportStatusBadge status={r.data.status} />, width: 'w-40' },
  ];

  return (
    <>
      <PageHeader
        title="承認・精算"
        breadcrumbs={[{ label: 'ホーム', to: '/' }, { label: '承認・精算' }]}
        description="申請の承認・差戻しと、承認済み申請の精算（支払）処理を行います。"
        actions={<Button variant="secondary" icon={<Download size={16} />} disabled={rows.length === 0} onClick={exportCsv}>CSV出力</Button>}
      />
      <form className="mb-4 flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); setApplied({ month, keyword }); }}>
        <label className="text-sm">
          <span className="mb-1 block text-foreground-secondary">対象月</span>
          <TextInput type="month" value={month} onChange={e => setMonth(e.target.value)} />
        </label>
        <label className="w-full max-w-xs text-sm">
          <span className="mb-1 block text-foreground-secondary">件名</span>
          <TextInput value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="件名で検索" />
        </label>
        <Button type="submit" variant="secondary" icon={<Search size={16} />}>検索</Button>
      </form>
      <Tabs className="mb-4" tabs={TABS.map(t => ({ ...t, count: counts[t.key] ?? 0 }))} active={tab} onChange={key => setTab(key as TabKey)} />
      {error ? <ErrorState description={error} onRetry={() => void load()} /> : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={r => r.id}
            loading={!reports}
            onRowClick={r => navigate(`/reports/${r.id}`)}
            sort={{ key: 'submittedAt', dir: 'asc' }}
            emptyMessage="該当する申請はありません。"
          />
          {reports && rows.length > 0 && (
            <p className="mt-3 text-right text-sm text-foreground-secondary">{rows.length}件 合計 <strong className="tabular-nums text-foreground">{formatYen(totalAmount)}</strong></p>
          )}
          {reports && !othersVisible && (
            <div className="mt-6">
              <Alert tone="info" title="他の利用者の申請が表示されない場合">
                申請データは本人のみ参照できる設定です。承認者グループには、ポータルのアプリ設定で「管理者グループ上書き」の
                全件参照（canReadAll）・全件更新（canUpdateAll）・ストレージ全件参照（canReadAllStorage）を付与してください。
              </Alert>
            </div>
          )}
        </>
      )}
    </>
  );
}
