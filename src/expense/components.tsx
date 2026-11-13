import { useEffect, useState } from 'react';
import { FileText, ImageOff, LoaderCircle } from 'lucide-react';
import { StatusBadge } from '@valance/sdk';
import { errorMessage, getReceiptUrl } from './api';
import { STATUS_LABEL, STATUS_TONE, type ReportStatus } from './model';

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return <StatusBadge label={STATUS_LABEL[status]} tone={STATUS_TONE[status]} />;
}

/** 領収書を新しいタブで開く。URL は都度取得（有効期限 1 時間のため保存しない） */
export async function openReceipt(key: string): Promise<void> {
  // ポップアップブロック対策として先にタブを確保する
  const opened = window.open('', '_blank');
  try {
    const { url } = await getReceiptUrl(key);
    if (opened) {
      opened.opener = null;
      opened.location.href = url;
    } else {
      window.location.assign(url);
    }
  } catch (error) {
    opened?.close();
    throw Object.assign(new Error(errorMessage(error, '領収書を開けませんでした。')), { cause: error });
  }
}

/** 領収書のサムネイル（PDF/JPEG/PNG のみ。その他はアイコン表示） */
export function ReceiptThumb({ receiptKey, name, onOpen }: { receiptKey: string; name?: string; onOpen: () => void }) {
  const [state, setState] = useState<{ key: string; url: string | null; failed: boolean } | null>(null);
  const supported = /\.(pdf|jpe?g|png)$/i.test(receiptKey);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    getReceiptUrl(receiptKey, true)
      .then(meta => { if (!cancelled) setState({ key: receiptKey, url: meta.url, failed: false }); })
      .catch(() => { if (!cancelled) setState({ key: receiptKey, url: null, failed: true }); });
    return () => { cancelled = true; };
  }, [receiptKey, supported]);

  const current = state?.key === receiptKey ? state : null;
  const label = `領収書を開く${name ? `（${name}）` : ''}`;
  return (
    <button
      type="button"
      onClick={onOpen}
      title={label}
      aria-label={label}
      className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded border border-border-strong bg-surface-secondary hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
    >
      {!supported && <FileText size={22} className="text-foreground-tertiary" aria-hidden="true" />}
      {supported && !current && <LoaderCircle size={18} className="animate-spin text-foreground-tertiary" aria-hidden="true" />}
      {supported && current?.url && <img src={current.url} alt="" className="h-full w-full object-cover" />}
      {supported && current?.failed && <ImageOff size={20} className="text-foreground-tertiary" aria-hidden="true" />}
    </button>
  );
}

/** CSV を生成してダウンロードさせる（Excel 向けに BOM 付き UTF-8） */
export function downloadCsv(fileName: string, rows: (string | number)[][]): void {
  const escape = (value: string | number) => {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = '﻿' + rows.map(row => row.map(escape).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
