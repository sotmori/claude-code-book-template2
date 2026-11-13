import { Check } from 'lucide-react';

/*
 * CMP-20: Stepper
 * ウィザード等の横型進捗表示。
 * 完了＝ブランド色塗りつぶし＋チェック、現在＝ブランド色リング＋太字ラベル、
 * 未来＝グレー。接続線は通過済み区間のみブランド色になる。
 * current が範囲外でも安全（負数＝すべて未来、steps.length 以上＝すべて完了）。
 */

export interface StepperProps {
  /** ステップ名（表示順） */
  steps: string[];
  /** 現在ステップの位置（0始まり）。これより前のステップは完了扱い */
  current: number;
  className?: string;
}

export function Stepper({ steps, current, className = '' }: StepperProps) {
  if (steps.length === 0) return null;

  return (
    <ol className={`flex items-start ${className}`}>
      {steps.map((label, index) => {
        const isCompleted = index < current;
        const isCurrent = index === current;
        return (
          <li
            key={`${index}-${label}`}
            aria-current={isCurrent ? 'step' : undefined}
            className={`flex items-start ${index > 0 ? 'flex-1' : ''}`}
          >
            {/* 接続線: 直前のステップが完了していればブランド色（ol 直下に置かず li 内に持つ） */}
            {index > 0 && (
              <span
                aria-hidden="true"
                className={`mt-4 h-0.5 min-w-4 flex-1 ${
                  index <= current ? 'bg-primary' : 'bg-border-strong'
                }`}
              />
            )}
            <span className="flex shrink-0 flex-col items-center gap-1.5 px-2 text-center">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  isCompleted
                    ? 'bg-primary text-white'
                    : isCurrent
                      ? 'border-2 border-primary bg-surface text-primary ring-4 ring-primary-lightest'
                      : 'border border-border-strong bg-surface text-foreground-disabled'
                }`}
              >
                {isCompleted ? <Check size={16} aria-hidden="true" /> : index + 1}
              </span>
              <span
                className={`text-sm ${
                  isCurrent
                    ? 'font-semibold text-foreground'
                    : isCompleted
                      ? 'text-foreground-secondary'
                      : 'text-foreground-tertiary'
                }`}
              >
                {label}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
