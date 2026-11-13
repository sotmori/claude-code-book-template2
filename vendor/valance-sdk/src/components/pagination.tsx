import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { formatNumber } from '../format';

/*
 * CMP-19: Pagination
 * 一覧のページ送り。「全123件中 1–50件を表示」の件数サマリと、
 * 先頭/前へ/ページ番号（省略記号つき）/次へ/末尾のボタン群で構成する。
 */

export interface PaginationProps {
  /** 現在ページ（1始まり）。範囲外の値は表示上クランプされる */
  page: number;
  /** 1ページあたりの件数 */
  pageSize: number;
  /** 総件数 */
  total: number;
  onChange: (page: number) => void;
  className?: string;
}

type PageItem = number | 'ellipsis-start' | 'ellipsis-end';

/* 現在ページの前後1ページ＋先頭/末尾を表示し、間を省略記号で詰める */
function buildPageItems(page: number, pageCount: number): PageItem[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const items: PageItem[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  if (start > 2) items.push('ellipsis-start');
  for (let p = start; p <= end; p += 1) items.push(p);
  if (end < pageCount - 1) items.push('ellipsis-end');
  items.push(pageCount);
  return items;
}

const BUTTON_BASE =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-sm px-1 text-sm transition-colors duration-fast disabled:cursor-not-allowed disabled:text-foreground-disabled disabled:hover:bg-transparent';

export function Pagination({ page, pageSize, total, onChange, className = '' }: PaginationProps) {
  /* 呼び出し側の不正値（0以下の pageSize・負の total・範囲外 page）を表示用に補正する */
  const safeTotal = Math.max(0, Math.floor(total));
  const safePageSize = Math.max(1, Math.floor(pageSize) || 1);
  const pageCount = Math.max(1, Math.ceil(safeTotal / safePageSize));
  const currentPage = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const from = safeTotal === 0 ? 0 : (currentPage - 1) * safePageSize + 1;
  const to = Math.min(currentPage * safePageSize, safeTotal);
  const isFirst = currentPage <= 1;
  const isLast = currentPage >= pageCount;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      {/* 件数サマリ */}
      <p className="text-sm text-foreground-tertiary">
        全{formatNumber(safeTotal)}件中 {formatNumber(from)}–{formatNumber(to)}件を表示
      </p>

      <nav aria-label="ページ送り" className="flex items-center gap-0.5">
        <button
          type="button"
          aria-label="最初のページ"
          disabled={isFirst}
          onClick={() => onChange(1)}
          className={`${BUTTON_BASE} text-foreground-secondary hover:bg-surface-tertiary`}
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          type="button"
          aria-label="前のページ"
          disabled={isFirst}
          onClick={() => onChange(currentPage - 1)}
          className={`${BUTTON_BASE} text-foreground-secondary hover:bg-surface-tertiary`}
        >
          <ChevronLeft size={16} />
        </button>

        {buildPageItems(currentPage, pageCount).map((item) =>
          typeof item === 'number' ? (
            <button
              key={item}
              type="button"
              aria-label={`${item}ページ目`}
              aria-current={item === currentPage ? 'page' : undefined}
              onClick={() => onChange(item)}
              className={`${BUTTON_BASE} ${
                item === currentPage
                  ? 'bg-primary font-medium text-white'
                  : 'text-foreground-secondary hover:bg-surface-tertiary'
              }`}
            >
              {item}
            </button>
          ) : (
            <span
              key={item}
              aria-hidden="true"
              className="inline-flex h-8 min-w-8 items-center justify-center text-sm text-foreground-disabled"
            >
              …
            </span>
          ),
        )}

        <button
          type="button"
          aria-label="次のページ"
          disabled={isLast}
          onClick={() => onChange(currentPage + 1)}
          className={`${BUTTON_BASE} text-foreground-secondary hover:bg-surface-tertiary`}
        >
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          aria-label="最後のページ"
          disabled={isLast}
          onClick={() => onChange(pageCount)}
          className={`${BUTTON_BASE} text-foreground-secondary hover:bg-surface-tertiary`}
        >
          <ChevronsRight size={16} />
        </button>
      </nav>
    </div>
  );
}
