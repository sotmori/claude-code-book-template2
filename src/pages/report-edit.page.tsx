import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Copy, Paperclip, Plus, Save, Send, Trash2, X } from 'lucide-react';
import {
  Alert, Button, ErrorState, FormField, NumberInput, PageHeader, PageSkeleton, SelectInput, TextArea, TextInput, useToast,
} from '@valance/sdk';
import {
  createReport, deleteReceiptQuietly, errorMessage, getReport, newRecordId, RECEIPT_ACCEPT, RECEIPT_MAX_BYTES, receiptKeyFor,
  updateReport, uploadReceipt,
} from '@/expense/api';
import { openReceipt } from '@/expense/components';
import {
  currentMonth, EXPENSE_CATEGORIES, formatYen, isEditable, newItem, newReportNo, sumItems, validateForSubmit,
  type ExpenseItem, type ExpenseReport, type ExpenseReportData, type HistoryEntry,
} from '@/expense/model';
import { useExpenseSession } from '@/expense/session';

interface FormState {
  title: string;
  periodMonth: string;
  department: string;
  note: string;
  items: ExpenseItem[];
}

const CATEGORY_OPTIONS = EXPENSE_CATEGORIES.map(c => ({ value: c, label: c }));

export function ReportEditPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const session = useExpenseSession();

  // 新規レコードの ID は一度だけ採番し、保存の再試行でも同じ値を使う
  const [newId] = useState(() => newRecordId());
  const [original, setOriginal] = useState<ExpenseReport | null>(null);
  const [form, setForm] = useState<FormState | null>(isNew ? {
    title: '', periodMonth: currentMonth(), department: '', note: '', items: [newItem()],
  } : null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState<'draft' | 'submit' | null>(null);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const removedKeys = useRef<string[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoadError(null);
    try {
      const record = await getReport(id);
      setOriginal(record);
      setForm({
        title: record.data.title,
        periodMonth: record.data.periodMonth ?? currentMonth(),
        department: record.data.department ?? '',
        note: record.data.note ?? '',
        items: record.data.items?.length ? record.data.items : [newItem()],
      });
    } catch (e) {
      setLoadError(errorMessage(e, '申請を読み込めませんでした。'));
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 画面表示時の初回読み込み
    void load();
  }, [load]);

  if (loadError) return <ErrorState description={loadError} onRetry={() => void load()} />;
  if (!form) return <PageSkeleton variant="detail" />;

  const editable = isNew || (original ? isEditable(original.data.status) : false);
  const isOwner = isNew || !original || !session.principalId || original.ownerUserId === session.principalId;
  const total = sumItems(form.items);

  const updateItem = (itemId: string, patch: Partial<ExpenseItem>) => {
    setForm(f => f && { ...f, items: f.items.map(item => item.id === itemId ? { ...item, ...patch } : item) });
  };
  const removeItem = (item: ExpenseItem) => {
    if (item.receiptKey) removedKeys.current.push(item.receiptKey);
    setForm(f => f && { ...f, items: f.items.filter(i => i.id !== item.id) });
  };
  const duplicateItem = (item: ExpenseItem) => {
    setForm(f => {
      if (!f) return f;
      const index = f.items.findIndex(i => i.id === item.id);
      const copy: ExpenseItem = { ...item, id: newRecordId(), receiptKey: undefined, receiptName: undefined };
      const items = [...f.items];
      items.splice(index + 1, 0, copy);
      return { ...f, items };
    });
  };

  const attachReceipt = async (item: ExpenseItem, file: File) => {
    if (file.size > RECEIPT_MAX_BYTES) {
      toast.error('領収書ファイルは10MB以下にしてください。');
      return;
    }
    const key = receiptKeyFor(file);
    setUploading(u => ({ ...u, [item.id]: true }));
    try {
      await uploadReceipt(key, file);
      if (item.receiptKey) removedKeys.current.push(item.receiptKey);
      updateItem(item.id, { receiptKey: key, receiptName: file.name });
      toast.success('領収書を添付しました');
    } catch (e) {
      toast.error(e instanceof Error && !('isAxiosError' in e) ? e.message : errorMessage(e, '領収書のアップロードに失敗しました。'));
    } finally {
      setUploading(u => ({ ...u, [item.id]: false }));
    }
  };

  const detachReceipt = (item: ExpenseItem) => {
    if (item.receiptKey) removedKeys.current.push(item.receiptKey);
    updateItem(item.id, { receiptKey: undefined, receiptName: undefined });
  };

  const save = async (mode: 'draft' | 'submit') => {
    const items = form.items.map(item => ({ ...item, payee: item.payee.trim(), description: item.description.trim(), amount: Math.round(item.amount) }));
    const problems = mode === 'submit'
      ? validateForSubmit({ title: form.title, items })
      : (form.title.trim() ? [] : ['件名を入力してください。']);
    setErrors(problems);
    if (problems.length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSaving(mode);
    const now = new Date().toISOString();
    const actor = { actorName: session.displayName, actorPrincipalId: session.principalId || undefined };
    const history: HistoryEntry[] = [...(original?.data.history ?? [])];
    if (isNew) history.push({ at: now, action: 'created', ...actor });
    if (mode === 'submit') history.push({ at: now, action: 'submitted', ...actor });

    const base = original?.data;
    const data: ExpenseReportData = {
      reportNo: base?.reportNo ?? newReportNo(),
      title: form.title.trim(),
      status: mode === 'submit' ? 'submitted' : (base?.status ?? 'draft'),
      applicantName: base?.applicantName ?? session.displayName,
      applicantEmail: base?.applicantEmail ?? (session.email || undefined),
      department: form.department.trim() || undefined,
      periodMonth: form.periodMonth || undefined,
      totalAmount: sumItems(items),
      itemCount: items.length,
      items: items.map(item => Object.fromEntries(Object.entries(item).filter(([, v]) => v !== undefined)) as unknown as ExpenseItem),
      note: form.note.trim() || undefined,
      submittedAt: mode === 'submit' ? now : base?.submittedAt,
      history,
    };
    const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as unknown as ExpenseReportData;
    try {
      const saved = isNew ? await createReport(newId, clean) : await updateReport(original as ExpenseReport, clean);
      const stillUsed = new Set(items.map(i => i.receiptKey).filter(Boolean));
      for (const key of removedKeys.current) if (!stillUsed.has(key)) void deleteReceiptQuietly(key);
      removedKeys.current = [];
      toast.success(mode === 'submit' ? '申請しました' : '下書きを保存しました');
      navigate(`/reports/${saved.id}`, { replace: true });
    } catch (e) {
      toast.error(errorMessage(e, '保存に失敗しました。'));
    } finally {
      setSaving(null);
    }
  };

  const busy = saving !== null || Object.values(uploading).some(Boolean);

  return (
    <>
      <PageHeader
        title={isNew ? '新規申請' : `申請の編集（${original?.data.reportNo ?? ''}）`}
        breadcrumbs={[{ label: 'ホーム', to: '/' }, { label: '自分の申請', to: '/reports' }, { label: isNew ? '新規申請' : '編集' }]}
      />
      {!editable || !isOwner || !session.canWrite ? (
        <Alert tone="warning" title="この申請は編集できません">
          編集できるのは、ご自身の「下書き」または「差戻し」の申請のみです。
        </Alert>
      ) : (
        <form onSubmit={e => { e.preventDefault(); void save('submit'); }} className="space-y-6">
          {errors.length > 0 && (
            <Alert tone="danger" title="入力内容を確認してください">
              <ul className="list-disc pl-5">{errors.map(m => <li key={m}>{m}</li>)}</ul>
            </Alert>
          )}
          {original?.data.status === 'rejected' && (
            <Alert tone="warning" title="差戻しされた申請です">
              {[...(original.data.history ?? [])].reverse().find(h => h.action === 'rejected')?.comment || '内容を修正して再申請してください。'}
            </Alert>
          )}

          <section className="grid grid-cols-1 gap-4 rounded-md border border-border-strong/60 bg-surface p-5 shadow-1 md:grid-cols-2">
            <FormField label="件名" required className="md:col-span-2">
              <TextInput value={form.title} maxLength={100} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="例: 6月 大阪出張旅費" />
            </FormField>
            <FormField label="対象月">
              <TextInput type="month" value={form.periodMonth} onChange={e => setForm({ ...form, periodMonth: e.target.value })} />
            </FormField>
            <FormField label="所属部署">
              <TextInput value={form.department} maxLength={100} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="例: 営業部" />
            </FormField>
            <FormField label="備考" className="md:col-span-2">
              <TextArea value={form.note} maxLength={1000} onChange={e => setForm({ ...form, note: e.target.value })} />
            </FormField>
          </section>

          <section className="rounded-md border border-border-strong/60 bg-surface p-5 shadow-1">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">明細</h2>
              <span className="text-sm text-foreground-secondary">合計 <strong className="text-lg tabular-nums text-foreground">{formatYen(total)}</strong></span>
            </div>
            <ol className="space-y-3">
              {form.items.map((item, index) => (
                <li key={item.id} className="rounded border border-border-strong/60 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground-secondary">明細 {index + 1}</span>
                    <div className="flex gap-1">
                      <Button type="button" size="sm" variant="ghost" icon={<Copy size={14} />} onClick={() => duplicateItem(item)}>複製</Button>
                      <Button type="button" size="sm" variant="ghost" icon={<Trash2 size={14} />} disabled={form.items.length <= 1} onClick={() => removeItem(item)}>削除</Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
                    <FormField label="利用日" required>
                      <TextInput type="date" value={item.date} onChange={e => updateItem(item.id, { date: e.target.value })} />
                    </FormField>
                    <FormField label="科目" required>
                      <SelectInput options={CATEGORY_OPTIONS} value={item.category} onChange={e => updateItem(item.id, { category: e.target.value })} />
                    </FormField>
                    <FormField label="支払先" className="lg:col-span-1">
                      <TextInput value={item.payee} maxLength={100} onChange={e => updateItem(item.id, { payee: e.target.value })} placeholder="例: JR東海" />
                    </FormField>
                    <FormField label="内容" required className="lg:col-span-2">
                      <TextInput value={item.description} maxLength={200} onChange={e => updateItem(item.id, { description: e.target.value })} placeholder="例: 東京⇔新大阪 新幹線往復" />
                    </FormField>
                    <FormField label="金額（税込・円）" required>
                      <NumberInput
                        min={0}
                        step={1}
                        value={Number.isFinite(item.amount) && item.amount !== 0 ? item.amount : ''}
                        onChange={e => updateItem(item.id, { amount: e.target.value === '' ? 0 : Number(e.target.value) })}
                      />
                    </FormField>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <Paperclip size={14} className="text-foreground-tertiary" aria-hidden="true" />
                    {item.receiptKey ? (
                      <>
                        <button type="button" className="text-primary underline-offset-4 hover:underline" onClick={() => { void openReceipt(item.receiptKey as string).catch((err: Error) => toast.error(err.message)); }}>
                          {item.receiptName || '領収書'}
                        </button>
                        <Button type="button" size="sm" variant="ghost" icon={<X size={14} />} onClick={() => detachReceipt(item)}>添付を外す</Button>
                      </>
                    ) : <span className="text-foreground-tertiary">領収書未添付</span>}
                    <label className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded border border-border-strong px-3 py-1 text-foreground-secondary hover:bg-surface-tertiary focus-within:outline focus-within:outline-2 focus-within:outline-primary">
                      <input
                        type="file"
                        accept={RECEIPT_ACCEPT}
                        className="sr-only"
                        disabled={uploading[item.id]}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (file) void attachReceipt(item, file);
                        }}
                      />
                      {uploading[item.id] ? 'アップロード中…' : item.receiptKey ? '差し替え' : '領収書を添付'}
                    </label>
                  </div>
                </li>
              ))}
            </ol>
            <Button type="button" variant="secondary" className="mt-3" icon={<Plus size={16} />} onClick={() => setForm({ ...form, items: [...form.items, newItem()] })}>
              明細を追加
            </Button>
          </section>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => navigate(isNew ? '/reports' : `/reports/${id}`)} disabled={busy}>キャンセル</Button>
            <Button type="button" variant="secondary" icon={<Save size={16} />} loading={saving === 'draft'} disabled={busy} onClick={() => void save('draft')}>下書き保存</Button>
            <Button type="submit" icon={<Send size={16} />} loading={saving === 'submit'} disabled={busy}>申請する</Button>
          </div>
        </form>
      )}
    </>
  );
}
