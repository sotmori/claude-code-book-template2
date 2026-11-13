import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';

/*
 * 規約部品: Button
 * ボタンの見た目はここでのみ定義する。画面側での独自ボタンスタイルは禁止。
 * 文言は LABELS 辞書（CNV-05）から選ぶこと。
 */

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** lucide-react アイコン要素 */
  icon?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-hover border border-transparent shadow-btn-solid',
  secondary:
    'bg-surface text-foreground-secondary border border-border-strong hover:bg-surface-tertiary shadow-btn-outline',
  danger:
    'bg-danger text-white hover:bg-danger-hover border border-transparent shadow-btn-solid',
  ghost:
    'bg-transparent text-foreground-secondary border border-transparent hover:bg-surface-tertiary',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-[38px] px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading = false, icon, className = '', children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center rounded-sm font-medium transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {/* スピナーは装飾のため読み上げ対象外。アクセシブルネームは children を維持する */}
      {loading ? <LoaderCircle size={16} aria-hidden="true" className="animate-spin" /> : icon}
      {children}
    </button>
  );
});
