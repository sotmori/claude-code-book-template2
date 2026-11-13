import type { ReactNode } from 'react';
import { formatDateTime } from '../format';
import type { StatusTone } from '../status';

/*
 * CMP-05: Timeline
 * 承認履歴・更新履歴・監査ログの縦型表示。ドット＋縦線のレールで時系列を示す。
 * 日時は formatDateTime（YYYY/MM/DD HH:mm）を経由し、独自整形は行わない。
 * 時系列リストとして <ol> で描画する。
 */

export interface TimelineItem {
  id: string;
  /** ISO 日時文字列（表示は formatDateTime で整形） */
  at: string;
  /** 操作者 */
  actor: string;
  /** 操作（例: 承認しました） */
  action: string;
  /** 補足（コメント・変更内容など） */
  detail?: ReactNode;
  /** ドット色のトーン。省略時は neutral */
  tone?: StatusTone;
}

export interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

const DOT_CLASSES: Record<StatusTone, string> = {
  neutral: 'bg-foreground-disabled',
  info: 'bg-info',
  warning: 'bg-warning',
  success: 'bg-primary',
  danger: 'bg-danger',
};

export function Timeline({ items, className = '' }: TimelineProps) {
  /* 履歴が無いときに空のリストを残さない */
  if (items.length === 0) return null;

  return (
    <ol className={className}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        /* 未知トーンは neutral へフォールバック */
        const dotClass = DOT_CLASSES[item.tone ?? 'neutral'] ?? DOT_CLASSES.neutral;
        return (
          <li key={item.id} className="flex gap-3">
            {/* レール: ドット＋縦線（最終行は線なし） */}
            <div className="flex flex-col items-center" aria-hidden="true">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`} />
              {!isLast && <span className="mt-1 w-px flex-1 bg-border-strong" />}
            </div>
            <div className={`min-w-0 flex-1 ${isLast ? '' : 'pb-6'}`}>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-sm font-medium text-foreground">{item.actor}</span>
                <span className="text-sm text-foreground-secondary">{item.action}</span>
                <time dateTime={item.at} className="text-xs text-foreground-tertiary">
                  {formatDateTime(item.at)}
                </time>
              </div>
              {item.detail !== undefined && (
                <div className="mt-1 text-sm text-foreground-tertiary">{item.detail}</div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
