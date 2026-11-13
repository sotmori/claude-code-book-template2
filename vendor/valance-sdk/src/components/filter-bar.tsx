import { type KeyboardEvent } from 'react';
import { Bookmark, Search } from 'lucide-react';
import { LABELS } from '../labels';
import { Button } from './button';
import { DateInput, SelectInput, TextInput, type SelectOption } from './form-field';
import { MultiSelectDropdown } from './multi-select';

/*
 * CMP-12: FilterBar（検索条件バー）
 * 一覧画面の先頭に置く横並び条件行。text / select / multi-select / date-range の 4 種に対応。
 * date-range の値は values の `${key}From` / `${key}To` に、multi-select は string[] で格納する。
 */

export interface FilterDef {
  key: string;
  label: string;
  type: 'text' | 'select' | 'multi-select' | 'date-range';
  /** type === 'select' | 'multi-select' のときの選択肢 */
  options?: SelectOption[];
}

/** 条件値。multi-select のみ string[]、それ以外は string */
export type FilterValues = Record<string, string | string[]>;

export interface FilterBarProps {
  filters: FilterDef[];
  /** 条件値。date-range は `${key}From` / `${key}To` の 2 キー */
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  onSearch: () => void;
  onClear: () => void;
  /** 保存済み条件のチップ行（任意） */
  savedViews?: string[];
  onSelectView?: (view: string) => void;
  className?: string;
}

export function FilterBar({
  filters,
  values,
  onChange,
  onSearch,
  onClear,
  savedViews,
  onSelectView,
  className = '',
}: FilterBarProps) {
  const set = (key: string, value: string | string[]) => onChange({ ...values, [key]: value });

  /** string 値の取り出し（multi-select 以外の入力用） */
  const strValue = (key: string): string => {
    const v = values[key];
    return typeof v === 'string' ? v : '';
  };

  /** string[] 値の取り出し（multi-select 用） */
  const arrValue = (key: string): string[] => {
    const v = values[key];
    return Array.isArray(v) ? v : [];
  };

  // テキスト欄で Enter → 検索実行
  const searchOnEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearch();
    }
  };

  return (
    <div className={`flex flex-col gap-3 rounded-md border border-border-strong bg-surface p-4 ${className}`}>
      {savedViews && savedViews.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-foreground-tertiary">保存済み条件</span>
          {savedViews.map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => onSelectView?.(view)}
              className="inline-flex items-center gap-1 rounded-full border border-border-strong bg-surface px-3 py-1 text-xs text-foreground-secondary transition-colors duration-fast hover:bg-surface-tertiary"
            >
              <Bookmark size={12} className="text-foreground-tertiary" />
              {view}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-end gap-3">
        {filters.map((filter) => (
          <div key={filter.key} className="flex flex-col gap-1">
            <label htmlFor={`filter-${filter.key}`} className="text-xs text-foreground-tertiary">
              {filter.label}
            </label>
            {filter.type === 'text' && (
              <TextInput
                id={`filter-${filter.key}`}
                value={strValue(filter.key)}
                onChange={(e) => set(filter.key, e.target.value)}
                onKeyDown={searchOnEnter}
                className="w-48"
              />
            )}
            {filter.type === 'select' && (
              <SelectInput
                id={`filter-${filter.key}`}
                options={filter.options ?? []}
                value={strValue(filter.key)}
                onChange={(e) => set(filter.key, e.target.value)}
                className="w-44"
              />
            )}
            {filter.type === 'multi-select' && (
              <MultiSelectDropdown
                id={`filter-${filter.key}`}
                options={filter.options ?? []}
                selected={arrValue(filter.key)}
                onChange={(next) => set(filter.key, next)}
                label={filter.label}
                className="w-52"
              />
            )}
            {filter.type === 'date-range' && (
              // 開始・終了は個別の名前で読み上げられるようにし、範囲全体は group で束ねる
              <div role="group" aria-label={filter.label} className="flex items-center gap-1">
                <DateInput
                  id={`filter-${filter.key}`}
                  aria-label={`${filter.label}（開始日）`}
                  value={strValue(`${filter.key}From`)}
                  onChange={(e) => set(`${filter.key}From`, e.target.value)}
                  className="w-40"
                />
                <span className="text-sm text-foreground-tertiary">〜</span>
                <DateInput
                  aria-label={`${filter.label}（終了日）`}
                  value={strValue(`${filter.key}To`)}
                  onChange={(e) => set(`${filter.key}To`, e.target.value)}
                  className="w-40"
                />
              </div>
            )}
          </div>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="primary" icon={<Search size={16} />} onClick={onSearch}>
            {LABELS.action.search}
          </Button>
          <Button variant="ghost" onClick={onClear}>
            {LABELS.action.clearFilter}
          </Button>
        </div>
      </div>
    </div>
  );
}
