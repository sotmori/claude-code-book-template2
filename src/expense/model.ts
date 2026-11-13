import { newRecordId } from '@/lib/record-id';

/** 申請状態。database.json の status 列の許容値と一致させる */
export type ReportStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';

export const STATUS_LABEL: Record<ReportStatus, string> = {
  draft: '下書き',
  submitted: '承認待ち',
  approved: '承認済（支払待ち）',
  rejected: '差戻し',
  paid: '精算済',
};

export type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

export const STATUS_TONE: Record<ReportStatus, StatusTone> = {
  draft: 'neutral',
  submitted: 'warning',
  approved: 'info',
  rejected: 'danger',
  paid: 'success',
};

export const EXPENSE_CATEGORIES = [
  '旅費交通費',
  '宿泊費',
  '会議費',
  '交際費',
  '通信費',
  '消耗品費',
  '書籍・研修費',
  '支払手数料',
  'その他',
] as const;

export interface ExpenseItem {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  category: string;
  payee: string;
  description: string;
  /** 円・税込 */
  amount: number;
  receiptKey?: string;
  receiptName?: string;
}

export type HistoryAction = 'created' | 'submitted' | 'withdrawn' | 'approved' | 'rejected' | 'paid';

export const HISTORY_LABEL: Record<HistoryAction, string> = {
  created: '作成',
  submitted: '申請',
  withdrawn: '取下げ',
  approved: '承認',
  rejected: '差戻し',
  paid: '精算完了',
};

export interface HistoryEntry {
  at: string;
  action: HistoryAction;
  actorName: string;
  actorPrincipalId?: string;
  comment?: string;
}

export interface ExpenseReportData {
  reportNo: string;
  title: string;
  status: ReportStatus;
  applicantName?: string;
  applicantEmail?: string;
  department?: string;
  periodMonth?: string;
  totalAmount?: number;
  itemCount?: number;
  items?: ExpenseItem[];
  note?: string;
  submittedAt?: string;
  approvedAt?: string;
  approverName?: string;
  paidAt?: string;
  history?: HistoryEntry[];
}

export interface ExpenseReport {
  id: string;
  ownerUserId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  data: ExpenseReportData;
}

const REPORT_STATUSES: readonly string[] = ['draft', 'submitted', 'approved', 'rejected', 'paid'];

export function isReportStatus(value: unknown): value is ReportStatus {
  return typeof value === 'string' && REPORT_STATUSES.includes(value);
}

/** 申請者が編集できる状態 */
export function isEditable(status: ReportStatus): boolean {
  return status === 'draft' || status === 'rejected';
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function currentMonth(): string {
  return todayIso().slice(0, 7);
}

export function newReportNo(): string {
  const compact = todayIso().replace(/-/g, '');
  const suffix = newRecordId().replace(/-/g, '').slice(0, 4).toUpperCase();
  return `EXP-${compact}-${suffix}`;
}

export function newItem(): ExpenseItem {
  return { id: newRecordId(), date: todayIso(), category: EXPENSE_CATEGORIES[0], payee: '', description: '', amount: 0 };
}

export function sumItems(items: readonly ExpenseItem[]): number {
  return items.reduce((total, item) => total + (Number.isFinite(item.amount) ? item.amount : 0), 0);
}

export function formatYen(value: number | undefined): string {
  return `¥${Math.round(value ?? 0).toLocaleString('ja-JP')}`;
}

export function formatDateTimeJa(value: string | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatDateJa(value: string | undefined): string {
  if (!value) return '—';
  return value.slice(0, 10).replace(/-/g, '/');
}

/** 入力値の検証。問題があれば日本語のメッセージ一覧を返す */
export function validateForSubmit(data: Pick<ExpenseReportData, 'title' | 'items'>): string[] {
  const errors: string[] = [];
  if (!data.title.trim()) errors.push('件名を入力してください。');
  const items = data.items ?? [];
  if (items.length === 0) errors.push('明細を1行以上入力してください。');
  items.forEach((item, index) => {
    const row = `明細${index + 1}行目`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date)) errors.push(`${row}: 利用日を入力してください。`);
    if (!item.description.trim()) errors.push(`${row}: 内容を入力してください。`);
    if (!(item.amount > 0)) errors.push(`${row}: 金額は1円以上で入力してください。`);
  });
  return errors;
}
