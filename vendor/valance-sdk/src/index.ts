/*
 * @valance/sdk 公開バレル
 * VCA デザインシステムの部品・シェル・辞書・整形ユーティリティを一括公開する。
 * トークン（styles/tokens.css）とテーマ（styles/themes/*.css）は
 * '@valance/sdk/styles/*'、Tailwind プリセットは '@valance/sdk/tailwind-preset'
 * から取り込む。
 */

export * from './components';
export * from './shells/admin-shell';
export * from './shells/mobile-shell';
export * from './shells/print-shell';
export * from './format';
export * from './labels';
export * from './pdf';
export * from './status';
export * from './theme';

export { newRecordId } from "./record-identity";
