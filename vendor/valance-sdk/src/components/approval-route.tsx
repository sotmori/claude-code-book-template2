import { useId } from 'react';
import { STATUS, type StatusKey, type StatusTone } from '../status';
import { formatDateTime } from '../format';
import { StatusBadge } from './status-badge';

/*
 * CMP-24: ApprovalRoute
 * 承認経路の横型ステップ表示。承認者ごとの状態色は STATUS 辞書の tone から
 * 決まり、画面側での色指定は禁止（CMP-04 StatusBadge と同一の対応表）。
 * 差戻し（danger）のコメントは該当承認者の下に danger-bg の吹き出しで表示する。
 *
 * アクセシビリティ:
 * - <ol> の各ステップが 1 つの <li>（経路線は li 内の装飾要素）
 * - 各ステップの読み上げ名は「承認者（役職）: 状態」
 * - 承認待ち（warning）のステップに aria-current="step"
 * - コメントは aria-describedby でステップに関連付け
 */

export interface ApprovalStep {
  id: string;
  /** 承認者名（先頭1文字をアバターに表示） */
  approver: string;
  /** 役職・所属 */
  role: string;
  status: StatusKey;
  /** 承認・差戻し日時（未処理は省略） */
  actedAt?: string;
  /** 差戻しコメント等 */
  comment?: string;
}

export interface ApprovalRouteProps {
  steps: ApprovalStep[];
  className?: string;
}

/** アバター円の状態色（tone → 色。承認済＝ブランド緑） */
const AVATAR_TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'border border-border-strong bg-surface-tertiary text-foreground-disabled',
  info: 'border border-info-border bg-info-bg text-info',
  warning: 'bg-warning-bg text-warning ring-2 ring-warning ring-offset-2',
  success: 'bg-primary text-white',
  danger: 'bg-danger text-white',
};

export function ApprovalRoute({ steps, className = '' }: ApprovalRouteProps) {
  const uid = useId();

  if (steps.length === 0) {
    return null;
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <ol aria-label="承認経路" className="flex items-start py-1">
        {steps.map((step, i) => {
          const { label: statusLabel, tone } = STATUS[step.status];
          const isDanger = tone === 'danger';
          /* 直前ステップが承認済（success）なら経路線をブランド緑で塗る */
          const connectorDone = i > 0 && STATUS[steps[i - 1].status].tone === 'success';
          const commentId = step.comment !== undefined ? `${uid}-comment-${step.id}` : undefined;

          return (
            <li
              key={step.id}
              aria-current={tone === 'warning' ? 'step' : undefined}
              aria-label={`${step.approver}（${step.role}）: ${statusLabel}`}
              aria-describedby={commentId}
              className={`flex items-start ${i > 0 ? 'flex-1' : ''}`}
            >
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={`mt-6 h-0.5 min-w-8 flex-1 rounded-full ${
                    connectorDone ? 'bg-primary' : 'bg-border-strong'
                  }`}
                />
              )}
              <div className="flex w-36 shrink-0 flex-col items-center gap-1.5 text-center">
                <div
                  aria-hidden="true"
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold ${AVATAR_TONE_CLASSES[tone]}`}
                >
                  {step.approver.trim().charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{step.approver}</p>
                  <p className="text-xs text-foreground-tertiary">{step.role}</p>
                </div>
                <StatusBadge status={step.status} />
                {step.actedAt !== undefined && (
                  <p className="text-xs tabular-nums text-foreground-tertiary">
                    {formatDateTime(step.actedAt)}
                  </p>
                )}
                {step.comment !== undefined && (
                  <p
                    id={commentId}
                    className={`mt-1 w-full rounded-md border px-2.5 py-1.5 text-left text-xs leading-relaxed ${
                      isDanger
                        ? 'border-danger-border bg-danger-bg text-danger'
                        : 'border-border-strong bg-surface-secondary text-foreground-secondary'
                    }`}
                  >
                    {step.comment}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
