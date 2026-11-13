import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Banknote, Check, Pencil, Send, Trash2, Undo2, X } from 'lucide-react';
import {
  Alert, Button, ConfirmDialog, DescriptionList, ErrorState, FormField, Modal, PageHeader, PageSkeleton, TextArea, TextInput,
  Timeline, useToast,
} from '@valance/sdk';
import { deleteReceiptQuietly, deleteReport, errorMessage, getReport, updateReport } from '@/expense/api';
import { openReceipt, ReceiptThumb, ReportStatusBadge } from '@/expense/components';
import {
  formatDateJa, formatDateTimeJa, formatYen, HISTORY_LABEL, isEditable, todayIso, validateForSubmit,
  type ExpenseReport, type ExpenseReportData, type HistoryAction,
} from '@/expense/model';
import { useExpenseSession } from '@/expense/session';

type Dialog = null | 'submit' | 'withdraw' | 'delete' | 'approve' | 'reject' | 'pay';

export function ReportDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const session = useExpenseSession();
  const [report, setReport] = useState<ExpenseReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [comment, setComment] = useState('');
  const [paidAt, setPaidAt] = useState(todayIso());
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setReport(await getReport(id));
    } catch (e) {
      setError(errorMessage(e, '申請を読み込めませんでした。'));
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 画面表示時の初回読み込み
    void load();
  }, [load]);

  if (error) return <ErrorState description={error} onRetry={() => void load()} />;
  if (!report) return <PageSkeleton variant="detail" />;

  const d = report.data;
  const isOwner = !session.principalId || report.ownerUserId === session.principalId;
  const canEdit = session.canWrite && isOwner && isEditable(d.status);
  const canWithdraw = session.canWrite && isOwner && d.status === 'submitted';
  const canDelete = session.canWrite && isOwner && d.status === 'draft';
  const canApprove = session.isApprover && d.status === 'submitted';
  const selfApproval = canApprove && isOwner && !!session.principalId;
  const canPay = session.isApprover && d.status === 'approved';

  const transition = async (action: HistoryAction, patch: Partial<ExpenseReportData>, message: string, note?: string) => {
    setWorking(true);
    try {
      // 最新版を取得してから更新（PUT は全置換のため）
      const latest = await getReport(report.id);
      if (latest.data.status !== d.status) {
        setReport(latest);
        toast.error('申請の状態が変更されています。最新の内容を確認してください。');
        return;
      }
      const now = new Date().toISOString();
      const history = [...(latest.data.history ?? []), {
        at: now,
        action,
        actorName: session.displayName,
        ...(session.principalId ? { actorPrincipalId: session.principalId } : {}),
        ...(note ? { comment: note } : {}),
      }];
      const next = Object.fromEntries(Object.entries({ ...latest.data, ...patch, history }).filter(([, v]) => v !== undefined)) as unknown as ExpenseReportData;
      setReport(await updateReport(latest, next));
      toast.success(message);
      setDialog(null);
      setComment('');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setWorking(false);
    }
  };

  const onSubmit = () => {
    const problems = validateForSubmit({ title: d.title, items: d.items });
    if (problems.length > 0) {
      toast.error(problems[0]);
      setDialog(null);
      return;
    }
    void transition('submitted', { status: 'submitted', submittedAt: new Date().toISOString() }, '申請しました');
  };

  const onDelete = async () => {
    setWorking(true);
    try {
      await deleteReport(report);
      for (const item of d.items ?? []) if (item.receiptKey) void deleteReceiptQuietly(item.receiptKey);
      toast.success('削除しました');
      navigate('/reports', { replace: true });
    } catch (e) {
      toast.error(errorMessage(e, '削除に失敗しました。'));
      setWorking(false);
    }
  };

  const open = (key: string) => { void openReceipt(key).catch((err: Error) => toast.error(err.message)); };

  const latestReject = [...(d.history ?? [])].reverse().find(h => h.action === 'rejected');

  return (
    <>
      <PageHeader
        title={d.title}
        breadcrumbs={[
          { label: 'ホーム', to: '/' },
          isOwner ? { label: '自分の申請', to: '/reports' } : { label: '承認・精算', to: '/approvals' },
          { label: d.reportNo },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            {canEdit && <Button variant="secondary" icon={<Pencil size={16} />} onClick={() => navigate(`/reports/${report.id}/edit`)}>編集</Button>}
            {canEdit && <Button icon={<Send size={16} />} onClick={() => setDialog('submit')}>申請する</Button>}
            {canWithdraw && <Button variant="secondary" icon={<Undo2 size={16} />} onClick={() => setDialog('withdraw')}>取下げ</Button>}
            {canDelete && <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => setDialog('delete')}>削除</Button>}
            {canApprove && <Button variant="danger" icon={<X size={16} />} onClick={() => setDialog('reject')}>差戻し</Button>}
            {canApprove && <Button icon={<Check size={16} />} disabled={selfApproval} onClick={() => setDialog('approve')}>承認</Button>}
            {canPay && <Button icon={<Banknote size={16} />} onClick={() => { setPaidAt(todayIso()); setDialog('pay'); }}>精算済にする</Button>}
          </div>
        }
      />

      {selfApproval && (
        <div className="mb-4"><Alert tone="info" title="自分の申請は承認できません">別の承認者に承認を依頼してください。</Alert></div>
      )}
      {d.status === 'rejected' && latestReject && (
        <div className="mb-4">
          <Alert tone="danger" title={`差戻し（${latestReject.actorName}・${formatDateTimeJa(latestReject.at)}）`}>
            {latestReject.comment || '理由の記載はありません。'}
          </Alert>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="rounded-md border border-border-strong/60 bg-surface p-5 shadow-1">
            <DescriptionList
              items={[
                { label: '申請番号', value: <span className="tabular-nums">{d.reportNo}</span> },
                { label: '状態', value: <ReportStatusBadge status={d.status} /> },
                { label: '申請者', value: `${d.applicantName ?? '—'}${d.department ? `（${d.department}）` : ''}` },
                { label: '対象月', value: d.periodMonth?.replace('-', '/') ?? '—' },
                { label: '申請日時', value: formatDateTimeJa(d.submittedAt) },
                { label: '承認', value: d.approvedAt ? `${d.approverName ?? ''}（${formatDateTimeJa(d.approvedAt)}）` : '—' },
                { label: '精算日', value: formatDateJa(d.paidAt) },
                { label: '合計金額', value: <strong className="text-lg tabular-nums">{formatYen(d.totalAmount)}</strong> },
                ...(d.note ? [{ label: '備考', value: <span className="whitespace-pre-wrap">{d.note}</span>, span: 2 as const }] : []),
              ]}
            />
          </section>

          <section className="rounded-md border border-border-strong/60 bg-surface shadow-1">
            <h2 className="border-b border-border-strong/60 px-5 py-3 font-semibold">明細（{d.items?.length ?? 0}件）</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-surface-secondary text-left text-foreground-secondary">
                  <tr>
                    <th className="px-4 py-2 font-medium">利用日</th>
                    <th className="px-4 py-2 font-medium">科目</th>
                    <th className="px-4 py-2 font-medium">支払先・内容</th>
                    <th className="px-4 py-2 text-right font-medium">金額</th>
                    <th className="px-4 py-2 font-medium">領収書</th>
                  </tr>
                </thead>
                <tbody>
                  {(d.items ?? []).map(item => (
                    <tr key={item.id} className="border-t border-border-strong/40 align-middle">
                      <td className="whitespace-nowrap px-4 py-2 tabular-nums">{formatDateJa(item.date)}</td>
                      <td className="whitespace-nowrap px-4 py-2">{item.category}</td>
                      <td className="px-4 py-2">
                        {item.payee && <div className="text-foreground-secondary">{item.payee}</div>}
                        <div>{item.description}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">{formatYen(item.amount)}</td>
                      <td className="px-4 py-2">
                        {item.receiptKey
                          ? <ReceiptThumb receiptKey={item.receiptKey} name={item.receiptName} onOpen={() => open(item.receiptKey as string)} />
                          : <span className="text-foreground-tertiary">なし</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border-strong font-semibold">
                    <td className="px-4 py-2" colSpan={3}>合計</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatYen(d.totalAmount)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </div>

        <section className="h-fit rounded-md border border-border-strong/60 bg-surface p-5 shadow-1">
          <h2 className="mb-3 font-semibold">履歴</h2>
          <Timeline
            items={[...(d.history ?? [])].reverse().map((h, index) => ({
              id: `${h.at}-${index}`,
              at: h.at,
              actor: h.actorName,
              action: HISTORY_LABEL[h.action] ?? h.action,
              detail: h.comment,
              tone: h.action === 'rejected' ? 'danger' : h.action === 'approved' || h.action === 'paid' ? 'success' : 'neutral',
            }))}
          />
        </section>
      </div>

      <ConfirmDialog open={dialog === 'submit'} title="申請しますか？" message={`合計 ${formatYen(d.totalAmount)} の経費を申請します。`} confirmLabel="申請する" onConfirm={onSubmit} onCancel={() => setDialog(null)} />
      <ConfirmDialog open={dialog === 'withdraw'} title="申請を取り下げますか？" message="下書きに戻り、再度編集できるようになります。" confirmLabel="取下げる" onConfirm={() => void transition('withdrawn', { status: 'draft' }, '申請を取り下げました')} onCancel={() => setDialog(null)} />
      <ConfirmDialog open={dialog === 'delete'} title="下書きを削除しますか？" message="この操作は取り消せません。添付した領収書も削除されます。" confirmLabel="削除する" destructive onConfirm={() => void onDelete()} onCancel={() => setDialog(null)} />

      <Modal
        open={dialog === 'approve' || dialog === 'reject'}
        title={dialog === 'approve' ? '申請を承認' : '申請を差戻し'}
        onClose={() => !working && setDialog(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDialog(null)} disabled={working}>取消す</Button>
            {dialog === 'approve'
              ? <Button loading={working} icon={<Check size={16} />} onClick={() => void transition('approved', { status: 'approved', approvedAt: new Date().toISOString(), approverName: session.displayName }, '承認しました', comment.trim() || undefined)}>承認する</Button>
              : <Button variant="danger" loading={working} disabled={!comment.trim()} icon={<X size={16} />} onClick={() => void transition('rejected', { status: 'rejected', approvedAt: undefined, approverName: undefined }, '差戻しました', comment.trim())}>差戻す</Button>}
          </div>
        }
      >
        <p className="mb-3 text-sm">{d.reportNo}「{d.title}」 {formatYen(d.totalAmount)}（申請者: {d.applicantName ?? '—'}）</p>
        <FormField label={dialog === 'reject' ? '差戻し理由' : 'コメント（任意）'} required={dialog === 'reject'}>
          <TextArea value={comment} maxLength={500} onChange={e => setComment(e.target.value)} />
        </FormField>
      </Modal>

      <Modal
        open={dialog === 'pay'}
        title="精算済にする"
        onClose={() => !working && setDialog(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDialog(null)} disabled={working}>取消す</Button>
            <Button loading={working} disabled={!/^\d{4}-\d{2}-\d{2}$/.test(paidAt)} icon={<Banknote size={16} />} onClick={() => void transition('paid', { status: 'paid', paidAt }, '精算済にしました')}>精算済にする</Button>
          </div>
        }
      >
        <p className="mb-3 text-sm">{d.applicantName ?? '申請者'} さんへ {formatYen(d.totalAmount)} を支払った日付を入力してください。</p>
        <FormField label="精算（支払）日" required>
          <TextInput type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)} />
        </FormField>
      </Modal>
    </>
  );
}
