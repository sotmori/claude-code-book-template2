import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown } from 'lucide-react';

/*
 * CMP-12b: MultiSelectDropdown（複数選択ドロップダウン）
 * 検索条件バー・列フィルタで使う「すべて選択／すべて解除」付きチェックボックス選択。
 * 全件または0件選択時はトリガーに「すべて」、それ以外は「N件選択」と表示する。
 * パネル部（MultiSelectPanel）は DataTable の列フィルタポップオーバーと共有する。
 */

/** 汎用UI語のため LABELS 辞書ではなくローカル定数（業務動詞ではない） */
const SELECT_ALL = 'すべて選択';
const CLEAR_ALL = 'すべて解除';
const DEFAULT_PLACEHOLDER = 'すべて';

export interface MultiSelectOption {
  value: string;
  label: string;
}

export interface MultiSelectPanelProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

/**
 * ドロップダウン内部のパネル（すべて選択／すべて解除＋チェックボックスリスト）。
 * MultiSelectDropdown と DataTable の列フィルタが共用する。
 * ArrowUp/Down でチェックボックス間を移動、Space で切替（ネイティブ動作）。
 */
export function MultiSelectPanel({ options, selected, onChange }: MultiSelectPanelProps) {
  const listRef = useRef<HTMLUListElement>(null);

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  // ArrowUp/Down でリスト内のチェックボックスへフォーカス移動
  const moveFocus = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const inputs = Array.from(listRef.current?.querySelectorAll('input') ?? []);
    if (inputs.length === 0) return;
    const current = inputs.indexOf(document.activeElement as HTMLInputElement);
    const next =
      e.key === 'ArrowDown' ? Math.min(current + 1, inputs.length - 1) : Math.max(current - 1, 0);
    inputs[next]?.focus();
  };

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border-strong/60 px-3 py-2">
        <button
          type="button"
          onClick={() => onChange(options.map((o) => o.value))}
          className="text-xs text-primary transition-colors duration-fast hover:text-primary-hover hover:underline"
        >
          {SELECT_ALL}
        </button>
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-xs text-primary transition-colors duration-fast hover:text-primary-hover hover:underline"
        >
          {CLEAR_ALL}
        </button>
      </div>
      <ul
        ref={listRef}
        role="listbox"
        aria-multiselectable="true"
        onKeyDown={moveFocus}
        className="max-h-64 overflow-auto py-1"
      >
        {options.map((opt) => (
          <li key={opt.value} role="option" aria-selected={selected.includes(opt.value)}>
            <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-foreground-secondary transition-colors duration-fast hover:bg-surface-secondary">
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0 accent-primary"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
              />
              <span className="truncate">{opt.label}</span>
            </label>
          </li>
        ))}
      </ul>
    </>
  );
}

export interface MultiSelectDropdownProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  /** トリガー先頭に付ける項目名（例: 'ステータス'） */
  label?: string;
  /** 全件または0件選択時の表示。省略時は「すべて」 */
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export function MultiSelectDropdown({
  options,
  selected,
  onChange,
  label,
  placeholder = DEFAULT_PLACEHOLDER,
  id,
  disabled,
  className = '',
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // 外側クリック・Escape で閉じる（Escape はトリガーへフォーカスを戻す）
  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // 0件または全件選択＝「すべて」、それ以外＝「N件選択」
  const isAllOrNone = selected.length === 0 || selected.length === options.length;
  const valueText = isAllOrNone ? placeholder : `${selected.length}件選択`;
  const triggerText = label ? `${label}: ${valueText}` : valueText;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-[38px] w-full items-center justify-between gap-2 rounded-sm border border-border-strong bg-surface px-3 text-sm text-foreground shadow-btn-outline transition-colors duration-fast focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/25 disabled:cursor-not-allowed disabled:bg-surface-tertiary disabled:text-foreground-disabled"
      >
        <span className="truncate">{triggerText}</span>
        <ChevronDown size={16} className="shrink-0 text-foreground-tertiary" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-dropdown mt-1 min-w-full rounded-md border border-border-strong bg-surface shadow-2">
          <MultiSelectPanel options={options} selected={selected} onChange={onChange} />
        </div>
      )}
    </div>
  );
}
