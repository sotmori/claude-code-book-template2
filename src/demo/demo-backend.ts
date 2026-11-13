/*
 * デモ版（npm run build:demo）専用のブラウザ内バックエンド。
 * ログインも Valance API も使わず、申請データは localStorage、領収書は IndexedDB に保存する。
 * 本番ビルドでは import.meta.env.VITE_DEMO が空になり、このモジュールは読み込まれない。
 */
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { api } from '@/auth/auth-service';
import { setSession } from '@/auth/app-session';
import { newRecordId } from '@/lib/record-id';
import type { ExpenseReport, ExpenseReportData } from '@/expense/model';

export const DEMO_APP_ID = '00000000-0000-4000-8000-00000000d3e0';

export interface DemoUser {
  principalId: string;
  name: string;
  email: string;
  appRole: 'edit' | 'manage';
  label: string;
}

export const DEMO_USERS: DemoUser[] = [
  { principalId: 'demo-applicant-1', name: '山田 花子', email: 'yamada@example.com', appRole: 'edit', label: '申請者' },
  { principalId: 'demo-applicant-2', name: '田中 一郎', email: 'tanaka@example.com', appRole: 'edit', label: '申請者' },
  { principalId: 'demo-approver-1', name: '佐藤 経理', email: 'sato@example.com', appRole: 'manage', label: '承認者・経理' },
];

// 同一オリジンで複数アプリが動く環境でも衝突しないよう、配信パスでキーを分ける
const APP_SCOPE = /^\/(?:customapps\/[^/]+\/[^/]+|marketplace\/[^/]+)\//.exec(window.location.pathname)?.[0] ?? '/';
const USER_KEY = `valance.demo:${APP_SCOPE}:expense.user`;
const RECORDS_KEY = `valance.demo:${APP_SCOPE}:expense.records`;

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* 容量超過・無効時はメモリ上のみ */ }
}

export function currentDemoUser(): DemoUser {
  const id = safeGet(USER_KEY);
  return DEMO_USERS.find(u => u.principalId === id) ?? DEMO_USERS[0];
}

export function switchDemoUser(principalId: string): void {
  safeSet(USER_KEY, principalId);
  window.location.hash = '#/';
  window.location.reload();
}

// ---------------------------------------------------------------- records (localStorage)

let memoryRecords: Record<string, ExpenseReport> | null = null;

function loadRecords(): Record<string, ExpenseReport> {
  if (memoryRecords) return memoryRecords;
  const raw = safeGet(RECORDS_KEY);
  if (raw) {
    try { memoryRecords = JSON.parse(raw) as Record<string, ExpenseReport>; return memoryRecords; } catch { /* 壊れていれば作り直す */ }
  }
  memoryRecords = seedRecords();
  saveRecords();
  return memoryRecords;
}

function saveRecords(): void {
  if (memoryRecords) safeSet(RECORDS_KEY, JSON.stringify(memoryRecords));
}

export function resetDemoData(): void {
  try { localStorage.removeItem(RECORDS_KEY); } catch { /* ignore */ }
  memoryRecords = null;
  try { indexedDB.deleteDatabase(DB_NAME); } catch { /* ignore */ }
  window.location.hash = '#/';
  window.location.reload();
}

function isoDaysAgo(days: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function seedRecords(): Record<string, ExpenseReport> {
  const [hanako, ichiro, sato] = DEMO_USERS;
  const month = isoDaysAgo(0).slice(0, 7);
  const make = (owner: DemoUser, days: number, data: ExpenseReportData): ExpenseReport => {
    const id = newRecordId();
    const at = isoDaysAgo(days);
    return { id, ownerUserId: owner.principalId, version: 1, createdAt: at, updatedAt: at, createdBy: owner.principalId, updatedBy: owner.principalId, data };
  };
  const item = (days: number, category: string, payee: string, description: string, amount: number) =>
    ({ id: newRecordId(), date: isoDaysAgo(days).slice(0, 10), category, payee, description, amount });
  const reports = [
    make(hanako, 3, {
      reportNo: 'EXP-DEMO-0001', title: '名古屋 顧客訪問', status: 'submitted', applicantName: hanako.name, applicantEmail: hanako.email,
      department: '営業部', periodMonth: month, totalAmount: 22180, itemCount: 2,
      items: [item(4, '旅費交通費', 'JR東海', '東京⇔名古屋 新幹線往復', 21080), item(4, '会議費', 'カフェ', '打合せ飲料', 1100)],
      submittedAt: isoDaysAgo(3), history: [{ at: isoDaysAgo(3, 9), action: 'created', actorName: hanako.name }, { at: isoDaysAgo(3), action: 'submitted', actorName: hanako.name }],
    }),
    make(hanako, 1, {
      reportNo: 'EXP-DEMO-0002', title: '技術書購入', status: 'draft', applicantName: hanako.name, applicantEmail: hanako.email,
      department: '営業部', periodMonth: month, totalAmount: 3520, itemCount: 1,
      items: [item(2, '書籍・研修費', 'オンライン書店', '業務改善の本', 3520)],
      history: [{ at: isoDaysAgo(1), action: 'created', actorName: hanako.name }],
    }),
    make(ichiro, 10, {
      reportNo: 'EXP-DEMO-0003', title: '大阪出張', status: 'approved', applicantName: ichiro.name, applicantEmail: ichiro.email,
      department: '開発部', periodMonth: month, totalAmount: 41500, itemCount: 2,
      items: [item(12, '旅費交通費', 'JR東海', '東京⇔新大阪 新幹線往復', 29000), item(12, '宿泊費', 'ビジネスホテル', '1泊', 12500)],
      submittedAt: isoDaysAgo(10), approvedAt: isoDaysAgo(8), approverName: sato.name,
      history: [{ at: isoDaysAgo(10, 9), action: 'created', actorName: ichiro.name }, { at: isoDaysAgo(10), action: 'submitted', actorName: ichiro.name },
        { at: isoDaysAgo(8), action: 'approved', actorName: sato.name, comment: '確認しました' }],
    }),
    make(ichiro, 5, {
      reportNo: 'EXP-DEMO-0004', title: 'タクシー代', status: 'rejected', applicantName: ichiro.name, applicantEmail: ichiro.email,
      department: '開発部', periodMonth: month, totalAmount: 4800, itemCount: 1,
      items: [item(6, '旅費交通費', 'タクシー', '客先→本社', 4800)],
      submittedAt: isoDaysAgo(5), history: [{ at: isoDaysAgo(5, 9), action: 'created', actorName: ichiro.name }, { at: isoDaysAgo(5), action: 'submitted', actorName: ichiro.name },
        { at: isoDaysAgo(4), action: 'rejected', actorName: sato.name, comment: '領収書を添付してください。' }],
    }),
  ];
  return Object.fromEntries(reports.map(r => [r.id, r]));
}

// ---------------------------------------------------------------- receipts (IndexedDB)

const DB_NAME = `valance.demo:${APP_SCOPE}:expense.files`;
const memoryFiles = new Map<string, Blob>();

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB を開けません'));
  });
}

export async function demoSaveFile(key: string, blob: Blob): Promise<void> {
  memoryFiles.set(key, blob);
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      tx.objectStore('files').put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('保存に失敗しました'));
    });
  } catch { /* IndexedDB が使えない環境ではメモリのみ */ }
}

async function demoLoadFile(key: string): Promise<Blob | null> {
  const cached = memoryFiles.get(key);
  if (cached) return cached;
  try {
    const db = await openDb();
    const blob = await new Promise<Blob | undefined>((resolve, reject) => {
      const request = db.transaction('files').objectStore('files').get(key);
      request.onsuccess = () => resolve(request.result as Blob | undefined);
      request.onerror = () => reject(request.error ?? new Error('読み込みに失敗しました'));
    });
    if (blob) memoryFiles.set(key, blob);
    return blob ?? null;
  } catch {
    return null;
  }
}

async function demoDeleteFile(key: string): Promise<void> {
  memoryFiles.delete(key);
  try {
    const db = await openDb();
    db.transaction('files', 'readwrite').objectStore('files').delete(key);
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------- axios adapter

class DemoHttpError extends Error {
  constructor(readonly status: number, readonly body: unknown) { super(`HTTP ${status}`); }
}

type Where = { field: string; op: string; value: unknown };

function fieldValue(record: ExpenseReport, field: string): unknown {
  if (field.startsWith('data.')) return (record.data as unknown as Record<string, unknown>)[field.slice(5)];
  return (record as unknown as Record<string, unknown>)[field];
}

async function handle(method: string, path: string, params: Record<string, unknown>, body: Record<string, unknown>): Promise<unknown> {
  const user = currentDemoUser();
  if (path === '/auth/profile') {
    return { principalId: user.principalId, name: user.name, email: user.email, role: 'USER', tenantId: 'demo-tenant', appId: DEMO_APP_ID,
      actions: ['custom_apps.read', 'custom_apps_data.read', 'custom_apps_data.write'] };
  }
  if (path === '/auth/logout') return {};
  const match = /^\/customapps\/[^/]+\/(.+)$/.exec(path);
  if (!match) throw new DemoHttpError(404, { message: 'デモ版では利用できない機能です。' });
  const rest = match[1];
  const records = loadRecords();
  // 承認者は全件参照・更新できる（本番の管理者グループ上書き canReadAll / canUpdateAll 相当）
  const visible = (r: ExpenseReport) => user.appRole === 'manage' || r.ownerUserId === user.principalId;

  if (rest === 'me/groups') return { appRole: user.appRole, groups: [] };

  if (rest === 'data/tables/expense_reports/query') {
    let items = Object.values(records).filter(visible);
    for (const w of (body.where as Where[] | undefined) ?? []) {
      if (w.op === 'eq') items = items.filter(r => fieldValue(r, w.field) === w.value);
      else if (w.op === 'in') items = items.filter(r => (w.value as unknown[]).includes(fieldValue(r, w.field)));
      else if (w.op === 'icontains') {
        const needle = String(w.value).normalize('NFKC').toLowerCase();
        items = items.filter(r => String(fieldValue(r, w.field) ?? '').normalize('NFKC').toLowerCase().includes(needle));
      }
    }
    items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
    return { items, nextCursor: null };
  }

  if (rest === 'data/tables/expense_reports/records' && method === 'post') {
    const id = String(body.id ?? newRecordId());
    if (records[id]) throw new DemoHttpError(409, { message: '同じIDのレコードが既に存在します。', data: { errorCode: 'DUPLICATE_RECORD' } });
    const now = new Date().toISOString();
    const record: ExpenseReport = { id, ownerUserId: user.principalId, version: 1, createdAt: now, updatedAt: now,
      createdBy: user.principalId, updatedBy: user.principalId, data: body.data as ExpenseReportData };
    records[id] = record;
    saveRecords();
    return { record };
  }

  const recordMatch = /^data\/tables\/expense_reports\/records\/([^/]+)$/.exec(rest);
  if (recordMatch) {
    const id = decodeURIComponent(recordMatch[1]);
    const record = records[id];
    if (!record || !visible(record)) throw new DemoHttpError(404, { message: 'レコードが見つかりません。' });
    if (method === 'get') return { record };
    const expected = method === 'put' ? body.expectedVersion : params.expectedVersion;
    if (expected !== undefined && Number(expected) !== record.version) {
      throw new DemoHttpError(409, { message: 'レコードが更新されています。', data: { errorCode: 'VERSION_CONFLICT', currentVersion: record.version } });
    }
    if (method === 'put') {
      const next: ExpenseReport = { ...record, version: record.version + 1, updatedAt: new Date().toISOString(), updatedBy: user.principalId, data: body.data as ExpenseReportData };
      records[id] = next;
      saveRecords();
      return { record: next };
    }
    if (method === 'delete') {
      delete records[id];
      saveRecords();
      return { tableName: 'expense_reports', id, deleted: true };
    }
  }

  const fileMatch = /^files\/([^/]+)$/.exec(rest);
  if (fileMatch) {
    const key = decodeURIComponent(fileMatch[1]);
    if (method === 'get') {
      const blob = await demoLoadFile(key);
      if (!blob) throw new DemoHttpError(404, { message: '指定されたファイルが見つかりません。' });
      return { key, url: URL.createObjectURL(blob), expiresIn: 3600, size: blob.size, contentType: blob.type };
    }
    if (method === 'delete') { await demoDeleteFile(key); return { key, deleted: true }; }
  }
  throw new DemoHttpError(404, { message: 'デモ版では利用できない機能です。' });
}

const demoAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  const method = (config.method ?? 'get').toLowerCase();
  const path = (config.url ?? '').replace(/^\/v1(?=\/)/, '');
  const params = (config.params ?? {}) as Record<string, unknown>;
  const body = typeof config.data === 'string' && config.data ? JSON.parse(config.data) as Record<string, unknown> : {};
  const respond = (status: number, data: unknown): AxiosResponse => ({ data, status, statusText: String(status), headers: {}, config });
  try {
    return respond(200, await handle(method, path, params, body));
  } catch (error) {
    const response = error instanceof DemoHttpError ? respond(error.status, error.body) : respond(500, { message: 'デモ処理でエラーが発生しました。' });
    return Promise.reject(Object.assign(new Error(`Request failed with status code ${response.status}`), {
      isAxiosError: true, response, config, toJSON: () => ({}),
    }));
  }
};

function base64Url(value: object): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** デモ用のセッションを用意し、API 通信をブラウザ内バックエンドへ差し替える */
export function startDemo(): void {
  api.defaults.adapter = demoAdapter;
  const user = currentDemoUser();
  const token = `${base64Url({ alg: 'none', typ: 'VAT' })}.${base64Url({ tenantId: 'demo-tenant', principalId: user.principalId, role: 'USER' })}.demo`;
  setSession(token, DEMO_APP_ID);
}
