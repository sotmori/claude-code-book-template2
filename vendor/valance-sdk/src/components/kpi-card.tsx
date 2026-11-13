import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { formatNumber } from '../format';

/*
 * CMP-02: KpiCard
 * ダッシュボード先頭に並べる指標カード。
 * delta（前期比 %）は正=success・負=danger の矢印付きで表示する。
 * 符号は色・矢印だけでなくテキスト（+8.2% / -3.1%）でも伝える。
 */

export interface KpiCardProps {
  /** 指標名（例: 売上高） */
  label: string;
  /** 表示値。金額は formatAmount / AmountText を経由すること */
  value: ReactNode;
  /** 値の後ろに小さく添える単位（例: %・件） */
  unit?: string;
  /** 前期比（%）。正負で色と矢印が変わる */
  delta?: number;
  /** lucide-react アイコン要素 */
  icon?: ReactNode;
  /** 補足表示（例: 2026年6月度） */
  caption?: string;
}

function deltaTone(delta: number): { color: string; icon: ReactNode } {
  if (delta > 0) return { color: 'text-success', icon: <ArrowUp size={14} aria-hidden="true" /> };
  if (delta < 0) return { color: 'text-danger', icon: <ArrowDown size={14} aria-hidden="true" /> };
  return { color: 'text-foreground-tertiary', icon: <Minus size={14} aria-hidden="true" /> };
}

/** 符号付きの前期比テキスト。色覚に依存せず増減が読み取れるようにする */
function deltaText(delta: number): string {
  if (delta > 0) return `+${formatNumber(delta)}%`;
  if (delta < 0) return `-${formatNumber(Math.abs(delta))}%`;
  return '0%';
}

export function KpiCard({ label, value, unit, delta, icon, caption }: KpiCardProps) {
  // NaN / Infinity は表示しない（未計算データの混入対策）
  const showDelta = delta !== undefined && Number.isFinite(delta);
  return (
    <div className="rounded-md border border-border-strong/60 bg-surface p-5 shadow-1">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm text-foreground-tertiary">{label}</span>
        {icon && (
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-lightest text-primary-dark"
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-foreground">{value}</span>
        {unit && <span className="text-sm text-foreground-tertiary">{unit}</span>}
      </div>
      {(showDelta || caption) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          {showDelta && (
            <span className="inline-flex items-center gap-1 text-xs">
              <span className="text-foreground-tertiary">前期比</span>
              <span className={`inline-flex items-center gap-0.5 font-medium ${deltaTone(delta).color}`}>
                {deltaTone(delta).icon}
                {deltaText(delta)}
              </span>
            </span>
          )}
          {caption && <span className="text-xs text-foreground-tertiary">{caption}</span>}
        </div>
      )}
    </div>
  );
}
