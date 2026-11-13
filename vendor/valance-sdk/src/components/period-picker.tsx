import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
import { formatPeriod } from '../format';

/** 汎用UI語のため LABELS 辞書ではなくローカル定数（業務動詞ではない） */
const PREV_MONTH = '前月へ';
const NEXT_MONTH = '翌月へ';

/*
 * CMP-26: PeriodPicker
 * 会計期間（月度）の選択。値は 'YYYY-MM' 文字列のみで完結する純粋な制御部品で、
 * 現在時刻（Date.now）には依存しない。表示は formatPeriod（CNV-02）を経由し、
 * closingDay 指定時は締め表現のキャプションを添える。
 */

export interface PeriodPickerProps {
  /** 会計期間 'YYYY-MM' */
  value: string;
  onChange: (value: string) => void;
  /** 締め日。指定時に「20日締め」等のキャプションを表示 */
  closingDay?: number;
  className?: string;
}

/** 'YYYY-MM' を delta ヶ月ずらす（年跨ぎ対応）。解釈できない値はそのまま返す */
function shiftMonth(period: string, delta: number): string {
  const [year, month] = period.split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return period;
  const totalMonths = year * 12 + (month - 1) + delta;
  const nextYear = Math.floor(totalMonths / 12);
  const nextMonth = (totalMonths % 12) + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}

/** 締め表現（formatClosingTerms と同じ規則: 31日以上は「末日締め」） */
function closingLabel(closingDay: number): string {
  return closingDay >= 31 ? '末日締め' : `${closingDay}日締め`;
}

export function PeriodPicker({ value, onChange, closingDay, className = '' }: PeriodPickerProps) {
  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="px-2"
          aria-label={PREV_MONTH}
          icon={<ChevronLeft size={16} />}
          onClick={() => onChange(shiftMonth(value, -1))}
        />
        <span className="w-32 text-center text-sm font-medium tabular-nums text-foreground">
          {formatPeriod(value)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="px-2"
          aria-label={NEXT_MONTH}
          icon={<ChevronRight size={16} />}
          onClick={() => onChange(shiftMonth(value, 1))}
        />
      </div>
      {closingDay !== undefined && (
        <p className="mt-1 text-xs text-foreground-tertiary">{closingLabel(closingDay)}</p>
      )}
    </div>
  );
}
