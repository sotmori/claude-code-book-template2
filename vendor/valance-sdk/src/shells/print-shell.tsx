import type { ReactNode } from 'react';
import './print.css';

/*
 * SHL-03: 印刷シェル
 * 画面ではA4用紙（210mm幅・15mm余白・shadow-2）をプレビュー表示し、
 * 印刷時は用紙のみを @page A4・余白0 で出力する。
 * - 印刷対象外の要素（ツールバー等）には NO_PRINT_CLASS（.no-print）を付与する。
 *   用紙（.print-sheet）の内側には付けないこと（帳票内容が欠落する）。
 *   シェル自身は用紙内に .no-print を一切持ち込まない。
 * - 改ページしたい位置の要素には PAGE_BREAK_CLASS（.page-break）を付与する
 * SCR-13 では AdminShell のプレビュー領域内に入れ子で使用する。
 */

/**
 * 印刷対象外の要素（ツールバー・操作UIなど）に付与するクラス。
 * @media print で display:none になる。用紙の外側でのみ使用する。
 */
export const NO_PRINT_CLASS = 'no-print';

/**
 * 改ページヘルパークラス。付与した要素の直後で改ページする
 * （break-after: page）。用紙内の帳票要素に付与して使用する。
 */
export const PAGE_BREAK_CLASS = 'page-break';

export interface PrintShellProps {
  /** 用紙（A4シート）内に描画する帳票内容 */
  children: ReactNode;
  /** プレビュー外枠への追加クラス */
  className?: string;
}

export function PrintShell({ children, className = '' }: PrintShellProps) {
  return (
    <div className={`print-preview flex justify-center overflow-x-auto bg-surface-secondary py-8 ${className}`}>
      <div className="print-sheet shrink-0 bg-surface shadow-2">{children}</div>
    </div>
  );
}
