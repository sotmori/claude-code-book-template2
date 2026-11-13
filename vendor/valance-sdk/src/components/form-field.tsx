import {
  Fragment,
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { ChevronDown, CircleAlert } from 'lucide-react';
import { LABELS } from '../labels';

/*
 * CMP-08: FormField ほか入力部品
 * フォーム項目の見た目はここでのみ定義する。画面側での <input> 直書きは禁止。
 * エラーは項目直下に表示する（CNV-03）。高さは --input-height (38px) に統一。
 */

/** 入力部品共通のベーススタイル。error 時は danger ボーダーに切替える */
function inputClass(error?: boolean, extra = ''): string {
  const border = error
    ? 'border-danger focus:border-danger focus:ring-danger/20'
    : 'border-border-strong focus:border-border-focus focus:ring-border-focus/25';
  return [
    'w-full rounded-sm border bg-surface px-3 text-sm text-foreground shadow-btn-outline',
    'placeholder:text-foreground-disabled transition-colors duration-fast',
    'focus:outline-none focus:ring-2',
    'disabled:cursor-not-allowed disabled:bg-surface-tertiary disabled:text-foreground-disabled',
    border,
    extra,
  ].join(' ');
}

/* ── FormField（ラベル＋必須マーク＋ヒント＋エラー）─────────── */

export interface FormFieldProps {
  label: string;
  required?: boolean;
  /** エラーメッセージ。項目直下に表示（ヒントより優先） */
  error?: string;
  hint?: string;
  /** 対応する入力部品の id。省略時は単一の子部品へ自動採番して配線する */
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

/** ラベル・エラー文の自動配線対象か（入力部品コンポーネント、または素の入力要素） */
function isWirableControl(child: ReturnType<typeof toSingleElement>): boolean {
  if (child === null) return false;
  if (typeof child.type !== 'string') return true;
  return child.type === 'input' || child.type === 'select' || child.type === 'textarea';
}

/** children が単一の React 要素（Fragment 以外）ならそれを返す */
function toSingleElement(children: ReactNode) {
  return isValidElement<Record<string, unknown>>(children) && children.type !== Fragment ? children : null;
}

export function FormField({ label, required, error, hint, htmlFor, children, className = '' }: FormFieldProps) {
  const autoId = useId();
  const errorId = `${autoId}-error`;
  const hintId = `${autoId}-hint`;
  const messageId = error ? errorId : hint ? hintId : undefined;

  const child = toSingleElement(children);
  const wirable = isWirableControl(child);
  const childId = wirable && typeof child?.props.id === 'string' ? child.props.id : undefined;
  // ラベルの参照先: 明示 htmlFor > 子の id > 自動採番（配線可能な子がある場合のみ）
  const controlId = htmlFor ?? childId ?? (wirable ? `${autoId}-control` : undefined);

  // 単一の入力部品には id / aria-describedby / aria-invalid / aria-required を注入する
  let control: ReactNode = children;
  if (child !== null && wirable) {
    const injected: Record<string, unknown> = {};
    if (htmlFor === undefined && childId === undefined) injected.id = controlId;
    const ownDescribedBy =
      typeof child.props['aria-describedby'] === 'string' ? child.props['aria-describedby'] : undefined;
    const describedBy = [ownDescribedBy, messageId].filter(Boolean).join(' ');
    if (describedBy !== '') injected['aria-describedby'] = describedBy;
    if (error && child.props['aria-invalid'] === undefined) injected['aria-invalid'] = true;
    if (required && child.props['aria-required'] === undefined) injected['aria-required'] = true;
    control = cloneElement(child, injected);
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={controlId} className="flex items-center gap-1.5 text-sm font-medium text-foreground-secondary">
        {label}
        {required && (
          /* 必須は aria-required で入力部品側に伝えるため、バッジは読み上げ対象外にする */
          <span aria-hidden="true" className="rounded-sm bg-danger-bg px-1.5 text-xs font-normal text-danger">
            {LABELS.form.required}
          </span>
        )}
      </label>
      {control}
      {error ? (
        <p id={errorId} className="flex items-center gap-1 text-xs text-danger">
          <CircleAlert size={12} aria-hidden="true" className="shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-foreground-tertiary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ── TextInput ──────────────────────────────────────────────── */

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { error, className = '', type = 'text', 'aria-invalid': ariaInvalid, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      aria-invalid={ariaInvalid ?? (error ? true : undefined)}
      className={inputClass(error, `h-[38px] ${className}`)}
      {...rest}
    />
  );
});

/* ── NumberInput（右寄せ・等幅数字）─────────────────────────── */

export interface NumberInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  { error, className = '', 'aria-invalid': ariaInvalid, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type="number"
      inputMode="numeric"
      aria-invalid={ariaInvalid ?? (error ? true : undefined)}
      className={inputClass(error, `h-[38px] text-right tabular-nums ${className}`)}
      {...rest}
    />
  );
});

/* ── SelectInput ────────────────────────────────────────────── */

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  error?: boolean;
  /** 未選択時の先頭表示。省略時は「選択してください」 */
  placeholder?: string;
}

export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(function SelectInput(
  { options, error, placeholder = LABELS.form.selectPlaceholder, className = '', 'aria-invalid': ariaInvalid, ...rest },
  ref,
) {
  return (
    <div className={`relative ${className}`}>
      <select
        ref={ref}
        aria-invalid={ariaInvalid ?? (error ? true : undefined)}
        className={inputClass(error, 'h-[38px] appearance-none pr-9')}
        {...rest}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground-tertiary"
      />
    </div>
  );
});

/* ── DateInput ──────────────────────────────────────────────── */

export interface DateInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  { error, className = '', 'aria-invalid': ariaInvalid, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type="date"
      aria-invalid={ariaInvalid ?? (error ? true : undefined)}
      className={inputClass(error, `h-[38px] ${className}`)}
      {...rest}
    />
  );
});

/* ── TextArea ───────────────────────────────────────────────── */

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { error, className = '', rows = 3, 'aria-invalid': ariaInvalid, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={ariaInvalid ?? (error ? true : undefined)}
      className={inputClass(error, `py-2 ${className}`)}
      {...rest}
    />
  );
});

/* ── CheckboxInput ──────────────────────────────────────────── */

export interface CheckboxInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** チェックボックス右側に表示するラベル */
  label?: string;
}

export const CheckboxInput = forwardRef<HTMLInputElement, CheckboxInputProps>(function CheckboxInput(
  { label, className = '', ...rest },
  ref,
) {
  return (
    <label
      className={`inline-flex h-[38px] cursor-pointer items-center gap-2 text-sm text-foreground-secondary ${className}`}
    >
      <input ref={ref} type="checkbox" className="h-4 w-4 shrink-0 accent-primary" {...rest} />
      {label && <span>{label}</span>}
    </label>
  );
});

/* ── RadioGroup ─────────────────────────────────────────────── */

export interface RadioGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'children'> {
  name: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(function RadioGroup(
  { name, options, value, onChange, disabled, className = '', ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      {...rest}
      role="radiogroup"
      className={`flex min-h-[38px] flex-wrap items-center gap-x-4 gap-y-2 ${className}`}
    >
      {options.map((opt) => (
        <label
          key={opt.value}
          className={`inline-flex items-center gap-2 text-sm text-foreground-secondary ${
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          }`}
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            disabled={disabled}
            onChange={() => onChange(opt.value)}
            className="h-4 w-4 shrink-0 accent-primary"
          />
          <span>{opt.label}</span>
        </label>
      ))}
    </div>
  );
});
