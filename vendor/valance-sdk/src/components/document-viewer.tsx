import { useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import { Document, Page } from 'react-pdf';
import { Button } from './button';
import { ErrorState, Skeleton } from './states';
import { LABELS } from '../labels';

/*
 * CMP-23: DocumentViewer
 * 原本イメージ（スキャン領収書・請求書・PDF 等）のプレビュー枠。
 * 拡大・縮小・回転・ページ送りのツールバーを持ち、OCR抽出箇所などを
 * ％座標のハイライト矩形としてシート上に重ねて表示する。
 *
 * 表示モード:
 * - children モード（既定）: 渡された ReactNode（SVG 領収書など）を変形フレームで表示
 * - fileUrl + fileType='pdf': react-pdf の Document/Page で実 PDF を描画
 *   （ワーカーはアプリ起動時に setupPdfWorker() で登録しておくこと）
 * - fileUrl + fileType='image': <img> を変形フレームで表示
 *
 * 変形（scale / rotate）とハイライト座標は動的算出のため inline style を許容。
 * PDF は CSS 変形ではなく Page の scale / rotate に反映する（描画品質のため）。
 * react-pdf 11 は既定で Suspense / Error Boundary に委ねるため suspense={false} を指定し、
 * 読込中・失敗の表示をこの部品の loading / onLoadError で完結させる（境界が無くても落ちない）。
 * 注釈レイヤ・テキストレイヤは描画しない（PDF 内スクリプト・リンクを実行させない）。
 */

export interface DocHighlight {
  id: string;
  /** シート左上を原点とした％座標 */
  x: number;
  y: number;
  w: number;
  h: number;
  /** 確認中の項目（danger 強調） */
  active?: boolean;
}

export type DocumentFileType = 'pdf' | 'image';

export interface DocumentViewerProps {
  /** 原本イメージ（SVG領収書など）。fileUrl 指定時は省略可 */
  children?: ReactNode;
  /** 原本ファイルの URL（プリサインド URL 等）。指定時はファイルモードで描画 */
  fileUrl?: string;
  /** fileUrl のファイル種別（省略時は pdf） */
  fileType?: DocumentFileType;
  /** シートに重ねるハイライト矩形 */
  highlights?: DocHighlight[];
  /** 総ページ数（2以上でページ送りを表示。PDF は読み込み結果が優先） */
  pageCount?: number;
  /** 現在ページ（1始まり。範囲外は 1..総ページ数 に丸める） */
  page?: number;
  onPageChange?: (page: number) => void;
  className?: string;
}

const ZOOM_MIN = 50;
const ZOOM_MAX = 200;
const ZOOM_STEP = 25;
const ZOOM_DEFAULT = 100;

/** PDF・画像の読み込み中に出すシート形状のプレースホルダ */
function SheetSkeleton() {
  return <Skeleton className="h-80 w-64" />;
}

export function DocumentViewer({
  children,
  fileUrl,
  fileType = 'pdf',
  highlights,
  pageCount = 1,
  page = 1,
  onPageChange,
  className = '',
}: DocumentViewerProps) {
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const [rotation, setRotation] = useState(0);
  /** 再試行のたびに増やして Document / img を作り直す */
  const [attempt, setAttempt] = useState(0);
  /** PDF 読み込みで判明した総ページ数（どのファイルの結果かをキーで保持） */
  const [loadedPages, setLoadedPages] = useState<{ key: string; pages: number } | null>(null);
  /** 読み込みに失敗したファイルのキー */
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const isPdf = fileUrl !== undefined && fileType === 'pdf';
  const isImage = fileUrl !== undefined && fileType === 'image';

  /*
   * 現在表示中ファイルの識別キー。読み込み結果・エラーはこのキーに紐付けて
   * 保持するため、ファイル差し替えや再試行で古い状態が自動的に無効になる。
   */
  const fileKey = `${fileType}:${fileUrl ?? ''}#${attempt}`;
  const docPages = isPdf && loadedPages?.key === fileKey ? loadedPages.pages : null;
  const loadError = fileUrl !== undefined && errorKey === fileKey;

  const totalPages = docPages ?? Math.max(1, pageCount);
  /* 範囲外の page 指定（制御 prop の誤用）は 1..totalPages に丸める */
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const zoomBy = (delta: number) =>
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z + delta)));

  const retry = () => setAttempt((a) => a + 1);

  /* PDF はシートが確定してから（誤位置に出さない）、それ以外は常時重ねる */
  const showHighlights = !isPdf || docPages !== null;

  return (
    <div className={`overflow-hidden rounded-md border border-border-strong bg-surface ${className}`}>
      {/* ツールバー */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-strong bg-surface px-2 py-1.5">
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="px-2"
            icon={<ZoomOut size={16} />}
            aria-label="縮小"
            disabled={zoom <= ZOOM_MIN}
            onClick={() => zoomBy(-ZOOM_STEP)}
          />
          <Button
            variant="ghost"
            size="sm"
            className="min-w-14 tabular-nums"
            aria-label="表示倍率をリセット"
            title="表示倍率をリセット"
            onClick={() => setZoom(ZOOM_DEFAULT)}
          >
            {zoom}%
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="px-2"
            icon={<ZoomIn size={16} />}
            aria-label="拡大"
            disabled={zoom >= ZOOM_MAX}
            onClick={() => zoomBy(ZOOM_STEP)}
          />
          <div aria-hidden="true" className="mx-1 h-4 w-px bg-border-strong" />
          <Button
            variant="ghost"
            size="sm"
            className="px-2"
            icon={<RotateCw size={16} />}
            aria-label="右に90度回転"
            onClick={() => setRotation((r) => (r + 90) % 360)}
          />
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="px-2"
              icon={<ChevronLeft size={16} />}
              aria-label={LABELS.action.back}
              disabled={currentPage <= 1}
              onClick={() => onPageChange?.(currentPage - 1)}
            />
            <span aria-live="polite" className="px-1 text-xs tabular-nums text-foreground-secondary">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="px-2"
              icon={<ChevronRight size={16} />}
              aria-label={LABELS.action.next}
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange?.(currentPage + 1)}
            />
          </div>
        )}
      </div>

      {/* プレビュー枠（クリップ＋スクロール。キーボードでもスクロール可能にする） */}
      <div
        role="region"
        aria-label="原本プレビュー"
        tabIndex={0}
        className="h-96 overflow-auto bg-surface-tertiary"
      >
        {loadError ? (
          <div className="flex min-h-full items-center justify-center">
            <ErrorState onRetry={retry} />
          </div>
        ) : (
          <div className="flex min-h-full w-max min-w-full items-center justify-center p-8">
            {/* 白いシート。CSS 変形は children / image モードのみ（動的算出のため inline style 許容） */}
            <div
              className={`relative bg-surface shadow-2 ${isPdf ? '' : 'transition-transform duration-fast'}`}
              style={isPdf ? undefined : { transform: `rotate(${rotation}deg) scale(${zoom / 100})` }}
            >
              {isPdf ? (
                <Document
                  key={fileKey}
                  file={fileUrl}
                  suspense={false}
                  onLoadSuccess={({ numPages }) => setLoadedPages({ key: fileKey, pages: numPages })}
                  onLoadError={() => setErrorKey(fileKey)}
                  loading={<SheetSkeleton />}
                  error={<SheetSkeleton />}
                >
                  {docPages !== null && (
                    <Page
                      pageNumber={currentPage}
                      scale={zoom / 100}
                      rotate={rotation}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      loading={<SheetSkeleton />}
                    />
                  )}
                </Document>
              ) : isImage ? (
                <img
                  key={fileKey}
                  src={fileUrl}
                  alt="原本イメージ"
                  className="max-w-none"
                  onError={() => setErrorKey(fileKey)}
                />
              ) : (
                children
              )}
              {showHighlights &&
                highlights?.map((h) => (
                  <div
                    key={h.id}
                    data-highlight-id={h.id}
                    aria-hidden="true"
                    className={`pointer-events-none absolute rounded-sm border-2 ${
                      h.active
                        ? 'border-danger bg-danger/10 shadow-2'
                        : 'border-warning bg-warning/10'
                    }`}
                    style={{ left: `${h.x}%`, top: `${h.y}%`, width: `${h.w}%`, height: `${h.h}%` }}
                  />
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
