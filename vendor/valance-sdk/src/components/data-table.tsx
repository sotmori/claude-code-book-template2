import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Filter } from 'lucide-react';
import { MultiSelectPanel, type MultiSelectOption } from './multi-select';
import { EmptyState, Skeleton } from './states';
import { ROW_HEIGHT_CLASSES, TABLE_TEXT_CLASSES, useTableDensity, type TableDensity } from './table-density';
import { LABELS } from '../labels';

/*
 * CMP-01: DataTable
 * 一覧・検索画面（SCR-01）の中核となる業務テーブル。
 * ソート・列フィルタ・行選択・密度3段階（standard 44px / comfortable 38px / dense 32px、
 * 既定は TableDefaultsProvider）・読み込み・0件表示を備える。
 * ソート可能列は常に上下ペア矢印を表示し、ソート中は方向矢印に切り替わる。
 * filterable 列はヘッダのフィルタアイコンから値のチェックボックス絞り込みができる
 * （列間は AND・列内は OR）。画面側での <table> 直書きは禁止（CONTRACTS.md）。
 */

export interface DataTableColumn<T> {
  /** 列キー。render 未指定時は row[key] をそのまま表示する */
  key: string;
  header: string;
  /** セル描画（StatusBadge・AmountText 等を差し込む） */
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  /** ソート比較値（省略時は row[key]） */
  sortValue?: (row: T) => string | number;
  /** ヘッダのフィルタアイコンから値で絞り込み可能にする */
  filterable?: boolean;
  /** フィルタ対象のテキスト値（省略時は row[key] を文字列化） */
  filterValue?: (row: T) => string;
  align?: 'left' | 'right' | 'center';
  /** 列幅の Tailwind クラス（例: 'w-32'） */
  width?: string;
}

export interface DataTableSort {
  key: string;
  dir: 'asc' | 'desc';
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  /** 行を一意に識別するキー */
  rowKey: (row: T) => string;
  selectable?: boolean;
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  onRowClick?: (row: T) => void;
  /** 行密度。省略時は TableDefaultsProvider の既定（無ければ standard）。文字サイズも連動する */
  density?: TableDensity;
  /** 初期ソート（以降はヘッダの矢印で切替） */
  sort?: DataTableSort;
  /** 読み込み中は Skeleton 行を表示 */
  loading?: boolean;
  /** 0件時に EmptyState のタイトルとして表示 */
  emptyMessage?: string;
}

const ALIGN_CLASSES = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const;

const JUSTIFY_CLASSES = {
  left: 'justify-start',
  right: 'justify-end',
  center: 'justify-center',
} as const;

const SKELETON_ROW_COUNT = 5;

/** フィルタポップオーバーの幅（w-56 相当。画面端でのはみ出し補正に使用） */
const FILTER_PANEL_WIDTH = 224;

/** 既定のセル表示（プリミティブ値のみ文字列化） */
function defaultCell<T>(row: T, key: string): ReactNode {
  const raw = (row as Record<string, unknown>)[key];
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'string' || typeof raw === 'number') return raw;
  return String(raw);
}

/** 列のフィルタ対象テキスト（filterValue 優先、なければ row[key] を文字列化） */
function filterTextOf<T>(col: DataTableColumn<T>, row: T): string {
  if (col.filterValue) return col.filterValue(row);
  const raw = (row as Record<string, unknown>)[col.key];
  return raw === null || raw === undefined ? '' : String(raw);
}

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'ja');
}

/* ── 列フィルタ（ヘッダのフィルタアイコン＋ポップオーバー）──── */

interface HeaderFilterProps {
  header: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}

function HeaderFilter({ header, options, selected, onChange, open, onToggle, onClose }: HeaderFilterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // テーブルの overflow コンテナに切られないよう fixed 配置（座標は開いた時点で算出）
  const [pos, setPos] = useState({ top: 0, left: 0 });

  // 外側クリック・Escape で閉じる（Escape 時はフォーカスをフィルタボタンへ戻す）
  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    };
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  const isSubset = selected.length < options.length;

  const toggleOpen = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 4,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - FILTER_PANEL_WIDTH - 8)),
      });
    }
    onToggle();
  };

  return (
    <div ref={containerRef} className="inline-flex">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`${header}で絞り込み`}
        aria-expanded={open}
        onClick={toggleOpen}
        className={`inline-flex items-center gap-1 rounded-sm p-0.5 transition-colors duration-fast ${
          isSubset
            ? 'text-primary hover:text-primary-hover'
            : 'text-foreground-tertiary hover:text-foreground-secondary'
        }`}
      >
        <Filter size={14} className={isSubset ? 'fill-current' : ''} />
        {isSubset && (
          <span className="rounded-full bg-primary-lightest px-1.5 text-xs font-medium tabular-nums text-primary-dark">
            {selected.length}
          </span>
        )}
      </button>
      {open && (
        <div
          role="group"
          aria-label={`${header}の絞り込み`}
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-dropdown w-56 rounded-md border border-border-strong bg-surface shadow-2"
        >
          <MultiSelectPanel options={options} selected={selected} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  onRowClick,
  density: densityProp,
  sort,
  loading = false,
  emptyMessage,
}: DataTableProps<T>) {
  const [sortState, setSortState] = useState<DataTableSort | null>(sort ?? null);
  /** 列キー → 選択中の値。エントリなし＝その列は絞り込みなし（全選択と同義） */
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [openFilterKey, setOpenFilterKey] = useState<string | null>(null);

  // filterable 列ごとの候補値（行順の重複なしリスト）
  const filterOptions = useMemo(() => {
    const map: Record<string, MultiSelectOption[]> = {};
    for (const col of columns) {
      if (!col.filterable) continue;
      const seen = new Set<string>();
      const opts: MultiSelectOption[] = [];
      for (const row of rows) {
        const value = filterTextOf(col, row);
        if (!seen.has(value)) {
          seen.add(value);
          opts.push({ value, label: value });
        }
      }
      map[col.key] = opts;
    }
    return map;
  }, [columns, rows]);

  // 列フィルタ適用（列間 AND・列内 OR）
  const filteredRows = useMemo(() => {
    const active = columns.filter((col) => col.filterable && filters[col.key] !== undefined);
    if (active.length === 0) return rows;
    return rows.filter((row) =>
      active.every((col) => (filters[col.key] ?? []).includes(filterTextOf(col, row))),
    );
  }, [rows, columns, filters]);

  const sortedRows = useMemo(() => {
    if (!sortState) return filteredRows;
    const col = columns.find((c) => c.key === sortState.key);
    if (!col) return filteredRows;
    const value = (row: T): string | number => {
      if (col.sortValue) return col.sortValue(row);
      const raw = (row as Record<string, unknown>)[col.key];
      return typeof raw === 'number' ? raw : String(raw ?? '');
    };
    const factor = sortState.dir === 'asc' ? 1 : -1;
    return [...filteredRows].sort((a, b) => compareValues(value(a), value(b)) * factor);
  }, [filteredRows, columns, sortState]);

  const allKeys = useMemo(() => filteredRows.map(rowKey), [filteredRows, rowKey]);
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selectedKeys.includes(k));
  const someSelected = allKeys.some((k) => selectedKeys.includes(k));

  const toggleSort = (key: string) => {
    setSortState((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      return prev.dir === 'asc' ? { key, dir: 'desc' } : null;
    });
  };

  /** 全候補が選択されたらエントリを外す（＝絞り込みなしに戻す） */
  const setColumnFilter = (key: string, next: string[]) => {
    setFilters((prev) => {
      const updated = { ...prev };
      if (next.length >= (filterOptions[key]?.length ?? 0)) {
        delete updated[key];
      } else {
        updated[key] = next;
      }
      return updated;
    });
  };

  const toggleAll = () => {
    onSelectionChange?.(allSelected ? [] : allKeys);
  };

  const toggleRow = (key: string) => {
    onSelectionChange?.(
      selectedKeys.includes(key) ? selectedKeys.filter((k) => k !== key) : [...selectedKeys, key],
    );
  };

  const density = useTableDensity(densityProp);
  const rowH = ROW_HEIGHT_CLASSES[density];
  const cellText = TABLE_TEXT_CLASSES[density];
  const colCount = columns.length + (selectable ? 1 : 0);

  return (
    <div className="overflow-x-auto rounded-md border border-border-strong/60 bg-surface">
      <table className="w-full border-collapse" aria-busy={loading || undefined}>
        <thead>
          <tr className="border-b border-border-strong bg-surface-secondary">
            {selectable && (
              <th scope="col" className="w-10 px-3">
                <input
                  type="checkbox"
                  aria-label="すべての行を選択"
                  className="h-4 w-4 accent-primary"
                  checked={allSelected}
                  disabled={allKeys.length === 0}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allSelected;
                  }}
                  onChange={toggleAll}
                />
              </th>
            )}
            {columns.map((col) => {
              const align = col.align ?? 'left';
              const options = filterOptions[col.key] ?? [];
              const sorted = sortState?.key === col.key ? sortState.dir : null;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={
                    col.sortable ? (sorted ? (sorted === 'asc' ? 'ascending' : 'descending') : 'none') : undefined
                  }
                  className={`px-3 py-2 text-xs font-medium text-foreground-tertiary ${ALIGN_CLASSES[align]} ${col.width ?? ''}`}
                >
                  <div className={`flex items-center gap-1 ${JUSTIFY_CLASSES[align]}`}>
                    {col.sortable ? (
                      <button
                        type="button"
                        aria-label={`${col.header}で並び替え`}
                        onClick={() => toggleSort(col.key)}
                        className={`inline-flex items-center gap-1 transition-colors duration-fast hover:text-foreground-secondary ${
                          sortState?.key === col.key ? 'text-foreground' : ''
                        }`}
                      >
                        {col.header}
                        {sortState?.key === col.key ? (
                          sortState.dir === 'asc' ? (
                            <ArrowUp size={14} />
                          ) : (
                            <ArrowDown size={14} />
                          )
                        ) : (
                          <ArrowUpDown size={14} className="text-foreground-tertiary" />
                        )}
                      </button>
                    ) : (
                      <span>{col.header}</span>
                    )}
                    {col.filterable && (
                      <HeaderFilter
                        header={col.header}
                        options={options}
                        selected={filters[col.key] ?? options.map((o) => o.value)}
                        onChange={(next) => setColumnFilter(col.key, next)}
                        open={openFilterKey === col.key}
                        onToggle={() => setOpenFilterKey((k) => (k === col.key ? null : col.key))}
                        onClose={() => setOpenFilterKey(null)}
                      />
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-strong/60">
          {loading &&
            Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => (
              <tr key={i} className={rowH}>
                {selectable && (
                  <td className="px-3">
                    <Skeleton className="h-4 w-4" />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className="px-3">
                    <Skeleton className="h-3.5 w-full" />
                  </td>
                ))}
              </tr>
            ))}
          {!loading && sortedRows.length === 0 && (
            <tr>
              <td colSpan={colCount} className="py-8">
                {/* 列フィルタで0件になった場合は「条件に一致するデータがありません」を優先する */}
                <EmptyState title={rows.length > 0 ? LABELS.state.emptyFiltered : emptyMessage} />
              </td>
            </tr>
          )}
          {!loading &&
            sortedRows.map((row) => {
              const key = rowKey(row);
              const selected = selectable && selectedKeys.includes(key);
              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === 'Enter') onRowClick(row);
                        }
                      : undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                  className={`${rowH} transition-colors duration-fast ${
                    selected ? 'bg-primary-lightest/60' : ''
                  } ${onRowClick ? 'cursor-pointer hover:bg-surface-secondary' : ''}`}
                >
                  {selectable && (
                    <td className="px-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`行を選択（${key}）`}
                        className="h-4 w-4 accent-primary"
                        checked={selectedKeys.includes(key)}
                        onChange={() => toggleRow(key)}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-3 ${cellText} text-foreground-secondary ${ALIGN_CLASSES[col.align ?? 'left']}`}
                    >
                      {col.render ? col.render(row) : defaultCell(row, col.key)}
                    </td>
                  ))}
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
