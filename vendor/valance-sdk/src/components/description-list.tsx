import type { ReactNode } from 'react';

/*
 * CMP-07: DescriptionList
 * 詳細・照会画面（SCR-02）の属性表示に使うキー・バリューグリッド。
 * <dl>/<dt>/<dd> のセマンティクスで描画する。
 * 2カラム基準のレスポンシブで、長い項目は span: 2 で横幅いっぱいに広げる。
 */

export interface DescriptionItem {
  label: string;
  value: ReactNode;
  /** 占有カラム数（省略時 1） */
  span?: 1 | 2;
}

export interface DescriptionListProps {
  items: DescriptionItem[];
  className?: string;
}

export function DescriptionList({ items, className = '' }: DescriptionListProps) {
  /* 項目が無いときに空のグリッドを残さない */
  if (items.length === 0) return null;

  return (
    <dl className={`grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 ${className}`}>
      {items.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          className={`border-b border-surface-tertiary pb-3 ${item.span === 2 ? 'sm:col-span-2' : ''}`}
        >
          <dt className="text-xs text-foreground-tertiary">{item.label}</dt>
          <dd className="mt-1 text-sm text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
