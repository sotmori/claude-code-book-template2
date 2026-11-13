import { STATUS, type StatusDef, type StatusKey, type StatusTone } from '../status';

/*
 * CMP-04: StatusBadge
 * ステータス表示はこの部品でのみ行う。色は STATUS 辞書の tone から決まり、
 * 画面側での色の直接指定は禁止（承認済＝ブランド緑）。
 * 通常は status キーで指定し、辞書外の表示が必要な場合のみ label + tone を使う。
 */

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'bg-surface-tertiary text-foreground-secondary',
  info: 'bg-info-bg text-info',
  warning: 'bg-warning-bg text-warning',
  success: 'bg-primary-lightest text-primary-dark',
  danger: 'bg-danger-bg text-danger',
};

interface StatusBadgeByKey {
  /** STATUS 辞書キー。label/tone より優先 */
  status: StatusKey;
  label?: never;
  tone?: never;
}

interface StatusBadgeByTone {
  status?: never;
  label: string;
  tone: StatusTone;
}

export type StatusBadgeProps = (StatusBadgeByKey | StatusBadgeByTone) & {
  className?: string;
};

export function StatusBadge(props: StatusBadgeProps) {
  /* 型上は StatusKey だが、実行時に辞書外キーが渡っても落ちないよう防御する */
  const def: StatusDef | undefined =
    props.status !== undefined ? STATUS[props.status] : undefined;
  const label = def?.label ?? props.label ?? props.status ?? '';
  const tone = def?.tone ?? props.tone ?? 'neutral';
  /* 未知トーンは neutral へフォールバック（className に undefined を混ぜない） */
  const toneClass = TONE_CLASSES[tone] ?? TONE_CLASSES.neutral;

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClass} ${props.className ?? ''}`}
    >
      {label}
    </span>
  );
}
