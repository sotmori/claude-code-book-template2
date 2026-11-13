import { pdfjs } from 'react-pdf';

/*
 * PDF.js ワーカー登録（react-pdf / pdfjs-dist）
 * VCA の静的リソースは相対パス配置が規約のため、既定値はアプリ直下の
 * './pdf.worker.min.mjs'。各アプリは pdfjs-dist の同ファイルを public/ に
 * コピーして自前ホストする（CDN 参照は禁止）。
 */

const DEFAULT_WORKER_URL = './pdf.worker.min.mjs';
/* react-pdf が import 時に自ら設定する値。アプリ側の明示設定ではないため上書き対象とする */
const REACT_PDF_PRESET_WORKER_URL = 'pdf.worker.mjs';

let configured = false;

/**
 * pdfjs の GlobalWorkerOptions.workerSrc を設定する。
 * - URL 指定時: 常にその URL で上書きする（明示指定が優先）。
 * - 引数省略時: 未設定（または react-pdf の初期値のまま）の場合のみ既定の相対パスを
 *   一度だけ設定する（冪等）。ホストアプリ側で設定済みの workerSrc は既定値で壊さない。
 */
export function setupPdfWorker(workerUrl?: string): void {
  if (workerUrl !== undefined) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    configured = true;
    return;
  }
  const current = pdfjs.GlobalWorkerOptions.workerSrc;
  if (configured || (current && current !== REACT_PDF_PRESET_WORKER_URL)) {
    return;
  }
  pdfjs.GlobalWorkerOptions.workerSrc = DEFAULT_WORKER_URL;
  configured = true;
}
