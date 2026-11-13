/*
 * DT-01連動: ステータス辞書
 * 「同じ状態には同じ色・同じ語」を全アプリで保証する対応表。
 * StatusBadge (CMP-04)・カンバン列 (SCR-10) はこの辞書から生成する。
 * 画面側での色の直接指定は禁止。
 */

export type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

export interface StatusDef {
  /** 表示ラベル（CNV-05辞書と整合） */
  label: string;
  /** 色トーン。success はブランド緑系で描画される（承認済＝ブランド緑） */
  tone: StatusTone;
}

export const STATUS = {
  draft: { label: '下書き', tone: 'neutral' },
  submitted: { label: '申請中', tone: 'info' },
  pending: { label: '承認待ち', tone: 'warning' },
  approved: { label: '承認済', tone: 'success' },
  rejected: { label: '差戻し', tone: 'danger' },
  processing: { label: '処理中', tone: 'info' },
  completed: { label: '完了', tone: 'success' },
  canceled: { label: '取消', tone: 'neutral' },
  active: { label: '有効', tone: 'success' },
  inactive: { label: '無効', tone: 'neutral' },
  overdue: { label: '期限超過', tone: 'danger' },
  unmatched: { label: '未消込', tone: 'warning' },
  matched: { label: '消込済', tone: 'success' },
  partial: { label: '一部消込', tone: 'info' },
  shipped: { label: '出荷済', tone: 'success' },
  ordered: { label: '受注済', tone: 'info' },
  arranging: { label: '手配中', tone: 'warning' },
} as const satisfies Record<string, StatusDef>;

export type StatusKey = keyof typeof STATUS;
