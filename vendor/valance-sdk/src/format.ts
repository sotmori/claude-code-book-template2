/*
 * CNV-02: 和式業務フォーマット
 * 金額・日付・締め表現・税率区分の表示規則。全アプリはここを経由して表示する。
 * 独自のフォーマット処理を各画面に書くことは禁止。
 */

/** 金額: 3桁区切り。負数は「▲1,234」形式（マイナス記号は使わない） */
export function formatAmount(value: number, opts?: { unit?: boolean }): string {
  const abs = Math.abs(value);
  const body = abs.toLocaleString('ja-JP');
  const sign = value < 0 ? '▲' : '';
  return opts?.unit === false ? `${sign}${body}` : `${sign}¥${body}`;
}

/** 数値: 3桁区切り（金額以外の数量など） */
export function formatNumber(value: number): string {
  return value.toLocaleString('ja-JP');
}

/** 日付: YYYY/MM/DD */
export function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

/** 日時: YYYY/MM/DD HH:mm */
export function formatDateTime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${formatDate(d)} ${h}:${min}`;
}

/** 税率: 0.1 →「10%」、0.08 →「8%（軽減）」 */
export function formatTaxRate(rate: number): string {
  const pct = Math.round(rate * 100);
  return pct === 8 ? '8%（軽減）' : `${pct}%`;
}

/** 会計期間: 2026-07 →「2026年7月度」 */
export function formatPeriod(period: string): string {
  const [y, m] = period.split('-');
  return `${y}年${Number(m)}月度`;
}

/** 締め・支払条件: 「20日締め翌月末払い」等の定型表現 */
export function formatClosingTerms(closingDay: number, paymentMonthOffset: number, paymentDay: number): string {
  const closing = closingDay >= 31 ? '末日締め' : `${closingDay}日締め`;
  const monthLabel = ['当月', '翌月', '翌々月'][paymentMonthOffset] ?? `${paymentMonthOffset}ヶ月後`;
  const payment = paymentDay >= 31 ? '末払い' : `${paymentDay}日払い`;
  return `${closing}${monthLabel}${payment}`;
}
