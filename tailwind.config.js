import valancePreset from '@valance/sdk/tailwind-preset';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [valancePreset],
  /* SDK 内のクラス名も走査対象に含める（vendor の raw TS 消費のため） */
  content: ['./index.html', './src/**/*.{ts,tsx}', './vendor/valance-sdk/src/**/*.{ts,tsx}'],
}
