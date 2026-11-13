import type { ReactNode } from 'react';
import { CircleAlert, Inbox, RotateCw } from 'lucide-react';
import { Button } from './button';
import { LABELS } from '../labels';

/*
 * CMP-16: 状態表示（CNV-01）
 * 空・エラー・読み込み中の3状態を全画面で統一する。
 * 空状態は次の行動（登録ボタン等）を action で案内する。
 * エラー状態は原因と対処を示し、onRetry 指定時に再試行を出す。
 * 読み込み中は Skeleton / SkeletonText（部分）と PageSkeleton（画面全体）を使い分ける。
 */

/* ── EmptyState ────────────────────────────────────────── */

export interface EmptyStateProps {
  title?: string;
  description?: string;
  /** 次の行動を案内するアクション（例: 登録ボタン） */
  action?: ReactNode;
}

export function EmptyState({ title = LABELS.state.empty, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <Inbox size={40} strokeWidth={1.5} className="text-foreground-disabled" />
      <p className="text-sm font-medium text-foreground-secondary">{title}</p>
      {description && <p className="text-xs text-foreground-tertiary">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* ── ErrorState ────────────────────────────────────────── */

export interface ErrorStateProps {
  title?: string;
  /** 原因・対処の説明 */
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = LABELS.state.error,
  description = LABELS.state.errorRetry,
  onRetry,
}: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <CircleAlert size={40} strokeWidth={1.5} className="text-danger" />
      <p className="text-sm font-medium text-foreground-secondary">{title}</p>
      <p className="text-xs text-foreground-tertiary">{description}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={<RotateCw size={14} />} onClick={onRetry} className="mt-2">
          再試行
        </Button>
      )}
    </div>
  );
}

/* ── Skeleton ──────────────────────────────────────────── */

export interface SkeletonProps {
  /** 形状（高さ・幅）は className で指定する。例: 'h-8 w-24' */
  className?: string;
}

export function Skeleton({ className = 'h-4 w-full' }: SkeletonProps) {
  return <div aria-hidden="true" className={`animate-pulse rounded-sm bg-surface-tertiary ${className}`} />;
}

export interface SkeletonTextProps {
  lines?: number;
}

export function SkeletonText({ lines = 3 }: SkeletonTextProps) {
  // 0以下・非数は行なし扱いにして描画エラーを防ぐ
  const count = Number.isFinite(lines) ? Math.max(0, Math.floor(lines)) : 0;
  return (
    <div aria-hidden="true" className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={`h-4 ${i === count - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

/* ── PageSkeleton ──────────────────────────────────────── */

export interface PageSkeletonProps {
  /** 画面種別に応じた骨格。省略時は一覧（table） */
  variant?: 'table' | 'detail' | 'dashboard';
}

/** 実ページのカード枠と同じ器（bg-surface＋境界線＋角丸） */
const CARD_CLASS = 'rounded-md border border-border-strong/60 bg-surface';

/** 一覧行の幅を軽くずらして実データの粒度感を出す（固定値・乱数不使用） */
const TABLE_ROW_WIDTHS = ['w-full', 'w-10/12', 'w-11/12', 'w-9/12', 'w-full', 'w-8/12', 'w-11/12', 'w-10/12'];

/** 照会2カラム行の値側の幅（固定値・乱数不使用） */
const DETAIL_VALUE_WIDTHS = ['w-2/3', 'w-1/2', 'w-3/4', 'w-2/5', 'w-1/2', 'w-2/3', 'w-3/5', 'w-1/2'];

/** 一覧: タイトルバー＋検索条件バー＋行ブロック */
function TableSkeleton() {
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
      <div className={`${CARD_CLASS} p-4`}>
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <div className={`${CARD_CLASS} overflow-hidden`}>
        <div className="flex items-center gap-6 border-b border-border-strong/60 bg-surface-secondary px-4 py-3">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-16" />
        </div>
        {TABLE_ROW_WIDTHS.map((width, i) => (
          <div key={i} className="border-b border-border-strong/40 px-4 py-3.5 last:border-b-0">
            <Skeleton className={`h-4 ${width}`} />
          </div>
        ))}
      </div>
    </>
  );
}

/** 照会: サマリカード＋2カラムのキー・バリュー行 */
function DetailSkeleton() {
  return (
    <>
      <div className={`${CARD_CLASS} p-6`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
      <div className={`${CARD_CLASS} p-6`}>
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
          {DETAIL_VALUE_WIDTHS.map((width, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-24 shrink-0" />
              <Skeleton className={`h-4 ${width}`} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/** ダッシュボード: KPIカード4枚＋大きめのチャート枠2枚 */
function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={`${CARD_CLASS} p-5`}>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-6 w-28" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className={`${CARD_CLASS} space-y-3 p-4`}>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-56 w-full rounded-md" />
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * 画面全体の読み込みプレースホルダ（CNV-01: 初期表示はスケルトン経由が既定）。
 * ルートの Suspense フォールバックと、ページ全体を占めるデータ取得中に使う。
 * 部分的な読み込みは Skeleton / SkeletonText、表は DataTable の loading を使う。
 */
export function PageSkeleton({ variant = 'table' }: PageSkeletonProps) {
  return (
    <div aria-hidden="true" className="space-y-4">
      {variant === 'table' ? <TableSkeleton /> : variant === 'detail' ? <DetailSkeleton /> : <DashboardSkeleton />}
    </div>
  );
}
