/*
 * テーマ切替（ホワイトレーベル・プレビュー）
 * 顧客ブランドの適用は src/design/themes/*.css のトークン差し替えのみで行う。
 * 本モジュールはカタログ上のプレビュー用に <html> の data-theme 属性の
 * 付け替えと localStorage への永続化だけを担う。
 */

export interface ThemeDef {
  key: string;
  label: string;
  /**
   * ピッカーのブランド色ドット用 R G B 値（例: '200 16 46'）。
   * Tailwind クラスはテーマ切替後に別ブランド色を指してしまい、静的な
   * クラス名列挙も成立しないため、ドットのみ算出値の inline style
   * （動的算出値の許容例外）で描画する。
   */
  previewRgb: string;
}

export const THEMES: ThemeDef[] = [
  { key: 'valance', label: '標準・Valance グリーン', previewRgb: '0 196 141' },
  { key: 'crimson', label: 'クリムゾン・コーポレート赤', previewRgb: '200 16 46' },
  { key: 'azure', label: 'アジュール・コーポレート青', previewRgb: '29 78 216' },
  { key: 'sumi', label: '墨・モノクロ', previewRgb: '31 41 55' },
];

const STORAGE_KEY = 'vca-theme';
const DEFAULT_THEME = 'valance';

/** data-theme 属性を付け替える（標準テーマは属性なし＝theme.css の :root 既定） */
function setThemeAttribute(key: string): void {
  if (key === DEFAULT_THEME) {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', key);
  }
}

/** テーマを適用して永続化する */
export function applyTheme(key: string): void {
  setThemeAttribute(key);
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // localStorage が使えない環境では永続化せずプレビューのみ
  }
}

/** 保存済みテーマキーを返す（未保存・不正値・localStorage 不可は標準テーマ） */
export function getStoredTheme(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null && THEMES.some((t) => t.key === stored)) {
      return stored;
    }
  } catch {
    // localStorage が使えない環境では標準テーマ
  }
  return DEFAULT_THEME;
}

/** 起動時に保存済みテーマを復元する（アプリ初期化で1回だけ呼ぶ） */
export function initTheme(): void {
  setThemeAttribute(getStoredTheme());
}
