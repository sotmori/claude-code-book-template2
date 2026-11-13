import { forwardRef, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check, Search, X } from 'lucide-react';
import { LABELS } from '../labels';
import { TextInput } from './form-field';

/*
 * CMP-09: LookupField（マスタ参照検索）
 * 得意先・品目などのコードマスタを「入力しながら絞り込む」参照部品。
 * 選択後は「コード 名称」を表示。ArrowUp/Down + Enter で選択、Escape・外側クリックで閉じる。
 * WAI-ARIA combobox パターン（フォーカスは入力に置き、aria-activedescendant で候補を指す）。
 */

export interface LookupOption {
  code: string;
  name: string;
  /** 補足表示（締め条件・区分など） */
  meta?: string;
}

export interface LookupFieldProps {
  options: LookupOption[];
  /** 選択中のコード。未選択は null */
  value: string | null;
  onChange: (code: string | null) => void;
  placeholder?: string;
  error?: boolean;
  id?: string;
  disabled?: boolean;
  className?: string;
  /** FormField 等から渡される支援技術向け属性（入力へ転送する） */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
}

export const LookupField = forwardRef<HTMLInputElement, LookupFieldProps>(function LookupField(
  {
    options,
    value,
    onChange,
    placeholder,
    error,
    id,
    disabled,
    className = '',
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    'aria-required': ariaRequired,
  },
  ref,
) {
  const autoId = useId();
  const baseId = id ?? autoId;
  const listboxId = `${baseId}-listbox`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = useMemo(() => options.find((o) => o.code === value) ?? null, [options, value]);

  // 入力文字列でコード・名称・補足を部分一致フィルタ
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === '') return options;
    return options.filter(
      (o) =>
        o.code.toLowerCase().includes(q) ||
        o.name.toLowerCase().includes(q) ||
        (o.meta ?? '').toLowerCase().includes(q),
    );
  }, [options, query]);

  // 絞り込みで件数が減っても、ハイライトは常に範囲内へ丸める
  const activeIndex = filtered.length === 0 ? -1 : Math.min(highlight, filtered.length - 1);
  const activeOptionId = open && activeIndex >= 0 ? `${baseId}-option-${activeIndex}` : undefined;

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  // ハイライト行を可視範囲に保つ
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const el = listRef.current?.children[activeIndex];
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const openDropdown = () => {
    if (disabled || open) return;
    setQuery('');
    // 選択済みがあればその行から始める（query は空なので filtered === options）
    const selectedIndex = selected !== null ? options.indexOf(selected) : -1;
    setHighlight(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const select = (option: LookupOption) => {
    onChange(option.code);
    close();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        openDropdown();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlight(Math.min(activeIndex + 1, Math.max(filtered.length - 1, 0)));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlight(Math.max(activeIndex - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && filtered[activeIndex]) select(filtered[activeIndex]);
        break;
      case 'Escape':
        // 開いている間の Escape は自分だけを閉じ、モーダル等へは伝播させない
        e.stopPropagation();
        close();
        break;
    }
  };

  // 閉じている間は選択内容（コード 名称）を表示し、開いている間は検索文字列を表示
  const displayValue = open ? query : selected ? `${selected.code} ${selected.name}` : '';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Search
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-foreground-tertiary"
      />
      <TextInput
        ref={ref}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={activeOptionId}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        aria-required={ariaRequired}
        error={error}
        disabled={disabled}
        value={displayValue}
        placeholder={open && selected ? `${selected.code} ${selected.name}` : placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlight(0);
          if (!open) setOpen(true);
        }}
        onFocus={openDropdown}
        onBlur={close}
        onKeyDown={handleKeyDown}
        className={`pl-9 ${selected ? 'pr-9' : ''}`}
        autoComplete="off"
      />
      {selected && !disabled && (
        <button
          type="button"
          aria-label={LABELS.action.remove}
          onClick={() => {
            onChange(null);
            setQuery('');
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-foreground-tertiary transition-colors duration-fast hover:bg-surface-tertiary hover:text-foreground"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          // リスト内クリックで入力のフォーカスを奪わない（blur による閉じを防ぐ）
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 right-0 top-full z-dropdown mt-1 max-h-64 overflow-auto rounded-md border border-border-strong bg-surface py-1 shadow-2"
        >
          {filtered.length === 0 ? (
            <li role="presentation" className="px-3 py-2 text-sm text-foreground-tertiary">
              {LABELS.state.emptyFiltered}
            </li>
          ) : (
            filtered.map((option, i) => (
              <li
                key={option.code}
                id={`${baseId}-option-${i}`}
                role="option"
                aria-selected={option.code === value}
                onClick={() => select(option)}
                onMouseEnter={() => setHighlight(i)}
                className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors duration-fast ${
                  i === activeIndex ? 'bg-surface-active' : ''
                } ${option.code === value ? 'bg-primary-lightest' : ''}`}
              >
                <span className="shrink-0 font-medium tabular-nums text-foreground-secondary">{option.code}</span>
                <span className="truncate text-foreground">{option.name}</span>
                {option.meta && (
                  <span className="ml-auto shrink-0 text-xs text-foreground-tertiary">{option.meta}</span>
                )}
                {option.code === value && <Check size={14} aria-hidden="true" className="shrink-0 text-primary-dark" />}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
});
