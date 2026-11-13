import { AmountText } from './amount-text';
import { formatTaxRate } from '../format';

/*
 * CMP-25: TaxSummary
 * 請求書・見積書の税計算サマリ（インボイス制度の区分記載に対応）。
 * 明細の税抜額（taxable）を税率ごとに集計し、消費税は税率区分単位で
 * 端数処理（四捨五入）する。表示順は 小計 → 税率別内訳 → 消費税合計 → 合計（税込）。
 */

export interface TaxSummaryLine {
  /** 税率（0.1 / 0.08） */
  taxRate: number;
  /** 税抜対象額 */
  taxable: number;
}

export interface TaxSummaryProps {
  lines: TaxSummaryLine[];
  /** 適格請求書発行事業者の登録番号（T + 13桁）。指定時のみ表示 */
  invoiceNumber?: string;
  className?: string;
}

interface RateGroup {
  taxRate: number;
  taxable: number;
  tax: number;
}

/** 税率ごとに税抜額を集計し、区分単位で消費税を四捨五入する */
function buildBreakdown(lines: TaxSummaryLine[]): RateGroup[] {
  const byRate = new Map<number, number>();
  for (const line of lines) {
    byRate.set(line.taxRate, (byRate.get(line.taxRate) ?? 0) + line.taxable);
  }
  return [...byRate.entries()]
    .map(([taxRate, taxable]) => ({ taxRate, taxable, tax: Math.round(taxable * taxRate) }))
    .sort((a, b) => b.taxRate - a.taxRate);
}

export function TaxSummary({ lines, invoiceNumber, className = '' }: TaxSummaryProps) {
  const breakdown = buildBreakdown(lines);
  const subtotal = breakdown.reduce((sum, group) => sum + group.taxable, 0);
  const taxTotal = breakdown.reduce((sum, group) => sum + group.tax, 0);
  const total = subtotal + taxTotal;

  return (
    <div className={`text-sm ${className}`}>
      {/* 小計（税抜） */}
      <div className="flex items-baseline justify-between gap-6">
        <span className="text-foreground-tertiary">小計</span>
        <AmountText value={subtotal} />
      </div>

      {/* 税率別内訳（8%（軽減）・10%）。明細0件時は内訳枠ごと出さない */}
      {breakdown.length > 0 && (
        <div className="mt-2 space-y-1.5 rounded-sm bg-surface-secondary px-3 py-2">
          <p className="text-xs font-medium text-foreground-tertiary">税率別内訳</p>
          {breakdown.map((group) => (
            <div key={group.taxRate} className="flex items-baseline justify-between gap-6">
              <span className="flex items-baseline gap-1.5 text-xs text-foreground-secondary">
                {formatTaxRate(group.taxRate)}対象
                <AmountText value={group.taxable} size="sm" />
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className="text-xs text-foreground-tertiary">消費税</span>
                <AmountText value={group.tax} size="sm" />
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 消費税合計 */}
      <div className="mt-2 flex items-baseline justify-between gap-6">
        <span className="text-foreground-tertiary">消費税合計</span>
        <AmountText value={taxTotal} />
      </div>

      {/* 合計（税込）: 強調表示 */}
      <div className="mt-3 flex items-baseline justify-between gap-6 border-t border-border-strong pt-3">
        <span className="font-semibold text-foreground">合計（税込）</span>
        <AmountText value={total} size="lg" emphasis />
      </div>

      {invoiceNumber !== undefined && (
        <p className="mt-3 border-t border-surface-tertiary pt-2 text-xs text-foreground-tertiary">
          インボイス登録番号: <span className="tabular-nums">{invoiceNumber}</span>
        </p>
      )}
    </div>
  );
}
