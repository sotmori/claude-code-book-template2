/*
 * @valance/sdk Tailwind プリセット
 * styles/tokens.css の CSS 変数を Tailwind クラスへ束ねる白ラベル層。
 * 消費側 tailwind.config.js の presets に列挙して使用する。
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: [],
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        'primary-hover': 'rgb(var(--color-primary-hover) / <alpha-value>)',
        'primary-lightest': 'rgb(var(--color-primary-lightest) / <alpha-value>)',
        'primary-light': 'rgb(var(--color-primary-light) / <alpha-value>)',
        'primary-dark': 'rgb(var(--color-primary-dark) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-secondary': 'rgb(var(--color-surface-secondary) / <alpha-value>)',
        'surface-tertiary': 'rgb(var(--color-surface-tertiary) / <alpha-value>)',
        'surface-active': 'rgb(var(--color-surface-active) / <alpha-value>)',
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
        'foreground-secondary': 'rgb(var(--color-foreground-secondary) / <alpha-value>)',
        'foreground-tertiary': 'rgb(var(--color-foreground-tertiary) / <alpha-value>)',
        'foreground-disabled': 'rgb(var(--color-foreground-disabled) / <alpha-value>)',
        'border-strong': 'rgb(var(--color-border-strong) / <alpha-value>)',
        'border-focus': 'rgb(var(--color-border-focus) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        'danger-hover': 'rgb(var(--color-danger-hover) / <alpha-value>)',
        'danger-bg': 'rgb(var(--color-danger-bg) / <alpha-value>)',
        'danger-border': 'rgb(var(--color-danger-border) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        'success-bg': 'rgb(var(--color-success-bg) / <alpha-value>)',
        'success-border': 'rgb(var(--color-success-border) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        'warning-bg': 'rgb(var(--color-warning-bg) / <alpha-value>)',
        'warning-border': 'rgb(var(--color-warning-border) / <alpha-value>)',
        info: 'rgb(var(--color-info) / <alpha-value>)',
        'info-bg': 'rgb(var(--color-info-bg) / <alpha-value>)',
        'info-border': 'rgb(var(--color-info-border) / <alpha-value>)',
        'chart-1': 'rgb(var(--color-chart-1) / <alpha-value>)',
        'chart-2': 'rgb(var(--color-chart-2) / <alpha-value>)',
        'chart-3': 'rgb(var(--color-chart-3) / <alpha-value>)',
        'chart-4': 'rgb(var(--color-chart-4) / <alpha-value>)',
        'chart-5': 'rgb(var(--color-chart-5) / <alpha-value>)',
        'chart-6': 'rgb(var(--color-chart-6) / <alpha-value>)',
        'chart-7': 'rgb(var(--color-chart-7) / <alpha-value>)',
        'chart-8': 'rgb(var(--color-chart-8) / <alpha-value>)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        1: 'var(--shadow-1)',
        2: 'var(--shadow-2)',
        3: 'var(--shadow-3)',
        'btn-solid': 'var(--shadow-btn-solid)',
        'btn-outline': 'var(--shadow-btn-outline)',
      },
      zIndex: {
        dropdown: 'var(--z-dropdown)',
        drawer: 'var(--z-drawer)',
        modal: 'var(--z-modal)',
        toast: 'var(--z-toast)',
      },
      transitionDuration: {
        fast: '150ms',
        slow: '300ms',
      },
      fontFamily: {
        /* Geist + Noto Sans JP（Web フォント）。オフライン時は従来の和文システムスタックへフォールバック */
        sans: [
          'Geist',
          '"Noto Sans JP"',
          '"Yu Gothic UI"',
          '"Yu Gothic"',
          'YuGothic',
          '"Hiragino Kaku Gothic ProN"',
          '"Hiragino Sans"',
          'Meiryo',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          '"Geist Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
      },
      /* ディスプレイサイズは -0.02em のトラッキング（デザインレビュー反映） */
      fontSize: {
        lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.02em' }],
        xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.02em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],
        '5xl': ['3rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
        /* テーブル本文（密度 3 段階）。値は tokens.css の --table-font-size-* / --table-line-height-* */
        'table-standard': ['var(--table-font-size-standard)', { lineHeight: 'var(--table-line-height-standard)' }],
        'table-comfortable': ['var(--table-font-size-comfortable)', { lineHeight: 'var(--table-line-height-comfortable)' }],
        'table-dense': ['var(--table-font-size-dense)', { lineHeight: 'var(--table-line-height-dense)' }],
      },
      maxWidth: {
        content: 'var(--content-max-width)',
      },
    },
  },
  plugins: [],
};
