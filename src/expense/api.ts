import axios from 'axios';
import { api } from '@/auth/auth-service';
import { getAppId } from '@/lib/app-id';
import { newRecordId } from '@/lib/record-id';
import type { ExpenseReport, ExpenseReportData, ReportStatus } from './model';

const TABLE = 'expense_reports';

function tablePath(suffix = ''): string {
  return `/customapps/${getAppId()}/data/tables/${TABLE}${suffix}`;
}

function filePath(key: string): string {
  return `/customapps/${getAppId()}/files/${encodeURIComponent(key)}`;
}

/** API エラーを利用者向けの日本語メッセージに変換する */
export function errorMessage(error: unknown, fallback = '処理に失敗しました。時間をおいて再度お試しください。'): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const body = error.response?.data as { message?: string; data?: { errorCode?: string } } | undefined;
    const code = body?.data?.errorCode;
    if (status === 409 && code === 'VERSION_CONFLICT') return '他のユーザーがこの申請を更新しました。画面を再読み込みしてから操作してください。';
    if (status === 409 && code === 'FILE_BUSY') return 'ファイルの更新中です。しばらくしてから再試行してください。';
    if (status === 403) return body?.message || 'この操作を行う権限がありません。';
    if (status === 404) return body?.message || '対象のデータが見つかりません。';
    if (status === 429) return 'ファイルの月間転送量上限に達しました。管理者にお問い合わせください。';
    if (body?.message) return body.message;
    if (!error.response) return '通信に失敗しました。ネットワーク接続を確認してください。';
  }
  return fallback;
}

export interface QueryOptions {
  statuses?: ReportStatus[];
  ownerUserId?: string;
  keyword?: string;
  periodMonth?: string;
}

interface QueryResponse {
  items: ExpenseReport[];
  nextCursor: string | null;
}

type WhereClause = { field: string; op: string; value: unknown };

/** 条件に合う申請をすべて取得する（ページングを内部で辿る。上限 2,000 件） */
export async function queryReports(options: QueryOptions = {}): Promise<ExpenseReport[]> {
  const where: WhereClause[] = [];
  if (options.statuses && options.statuses.length > 0) {
    where.push(options.statuses.length === 1
      ? { field: 'data.status', op: 'eq', value: options.statuses[0] }
      : { field: 'data.status', op: 'in', value: options.statuses });
  }
  if (options.ownerUserId) where.push({ field: 'ownerUserId', op: 'eq', value: options.ownerUserId });
  if (options.periodMonth) where.push({ field: 'data.periodMonth', op: 'eq', value: options.periodMonth });
  if (options.keyword?.trim()) where.push({ field: 'data.title', op: 'icontains', value: options.keyword.trim() });

  const results: ExpenseReport[] = [];
  let cursor: string | null = null;
  do {
    const { data }: { data: QueryResponse } = await api.post<QueryResponse>(tablePath('/query'), {
      where,
      orderBy: [{ field: 'updatedAt', direction: 'desc' }, { field: 'id', direction: 'asc' }],
      limit: 500,
      cursor,
    });
    results.push(...data.items);
    cursor = data.nextCursor;
  } while (cursor && results.length < 2000);
  return results;
}

export async function getReport(id: string): Promise<ExpenseReport> {
  const { data } = await api.get<{ record: ExpenseReport }>(tablePath(`/records/${encodeURIComponent(id)}`));
  return data.record;
}

/** 新規作成。id は呼び出し側で一度だけ採番し、再試行時も同じ値を使う */
export async function createReport(id: string, reportData: ExpenseReportData): Promise<ExpenseReport> {
  const { data } = await api.post<{ record: ExpenseReport }>(tablePath('/records'), { id, data: reportData });
  return data.record;
}

/** 全置換更新（PUT は data 全体を置き換えるため、必ず完全な data を渡す） */
export async function updateReport(report: ExpenseReport, reportData: ExpenseReportData): Promise<ExpenseReport> {
  const { data } = await api.put<{ record: ExpenseReport }>(tablePath(`/records/${encodeURIComponent(report.id)}`), {
    expectedVersion: report.version,
    data: reportData,
  });
  return data.record;
}

export async function deleteReport(report: ExpenseReport): Promise<void> {
  await api.delete(tablePath(`/records/${encodeURIComponent(report.id)}`), { params: { expectedVersion: report.version } });
}

// ---------------------------------------------------------------- receipts (File Store)

const RECEIPT_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

export const RECEIPT_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp,image/heic';
export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024;

export function receiptKeyFor(file: File): string {
  const ext = RECEIPT_TYPES[file.type] ?? (file.name.split('.').pop() ?? 'bin').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) ?? 'bin';
  return `receipt-${newRecordId()}.${ext || 'bin'}`;
}

interface UploadResponse {
  key: string;
  upload: { url: string; fields: Record<string, string> };
}

/** 領収書をアップロードする: presigned POST を取得 → S3 へ直接送信（Authorization は付けない） */
export async function uploadReceipt(key: string, file: File): Promise<void> {
  if (import.meta.env.VITE_DEMO) {
    const { demoSaveFile } = await import('@/demo/demo-backend');
    await demoSaveFile(key, file);
    return;
  }
  const contentType = file.type || 'application/octet-stream';
  const { data } = await api.post<UploadResponse>(filePath(key), { size: file.size, contentType });
  const form = new FormData();
  for (const [name, value] of Object.entries(data.upload.fields)) form.append(name, value);
  form.append('file', file);
  const response = await fetch(data.upload.url, { method: 'POST', body: form });
  if (!response.ok) throw new Error(`領収書のアップロードに失敗しました（${response.status}）。`);
}

interface DownloadResponse {
  url: string;
  contentType: string;
  size: number;
}

/** presigned ダウンロード URL を取得する（有効期限 1 時間。保存せず表示のたびに取り直す） */
export async function getReceiptUrl(key: string, thumbnail = false): Promise<DownloadResponse> {
  const { data } = await api.get<DownloadResponse>(filePath(key), { params: thumbnail ? { variant: 'thumb' } : undefined });
  return data;
}

/** 不要になった領収書を削除する。アップロード直後の FILE_BUSY などは無視（孤立ファイルとして残るのみ） */
export async function deleteReceiptQuietly(key: string): Promise<void> {
  try {
    await api.delete(filePath(key));
  } catch {
    // 削除できなくても申請データの整合性には影響しない
  }
}

// ---------------------------------------------------------------- app role

export type AppRole = 'view' | 'edit' | 'manage';

export async function fetchAppRole(): Promise<AppRole | null> {
  try {
    const { data } = await api.get<{ appRole?: string }>(`/customapps/${getAppId()}/me/groups`);
    const role = data.appRole;
    return role === 'view' || role === 'edit' || role === 'manage' ? role : null;
  } catch (error) {
    if (axios.isAxiosError(error) && (error.response?.status === 403 || error.response?.status === 404)) return null;
    throw error;
  }
}

export { newRecordId };
