import { formatAmount } from '../format';

/*
 * CMP-22: AmountText
 * 金額表示はこの部品でのみ行う。表示形式は formatAmount（CNV-02）に従い、
 * 負数は「▲1,234」形式・text-danger で描画する。桁揃えのため常に
 * tabular-nums + 右揃えとし、画面側での独自金額フォーマットは禁止。
 */

export type AmountTextSize = 'sm' | 'md' | 'lg';

export interface AmountTextProps {
  value: number;
  /** 通貨記号（¥）を付けるか。省略時 true（表頭に「金額(円)」等がある列では false） */
  unit?: boolean;
  size?: AmountTextSize;
  /** 合計行などの強調表示（font-semibold） */
  emphasis?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<AmountTextSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export function AmountText({ value, unit, size = 'md', emphasis = false, className = '' }: AmountTextProps) {
  const negative = value < 0;
  // 「▲」は読み上げが曖昧なため、負数のみフル読み（例: マイナス1,234円）を与える
  const ariaLabel = negative
    ? `マイナス${Math.abs(value).toLocaleString('ja-JP')}${unit === false ? '' : '円'}`
    : undefined;
  return (
    <span
      aria-label={ariaLabel}
      className={`inline-block whitespace-nowrap text-right tabular-nums ${SIZE_CLASSES[size]} ${
        negative ? 'text-danger' : ''
      } ${emphasis ? 'font-semibold' : ''} ${className}`}
    >
      {formatAmount(value, { unit })}
    </span>
  );
}
