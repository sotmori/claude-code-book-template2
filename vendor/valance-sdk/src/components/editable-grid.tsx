import { useRef, useState, type ClipboardEvent, type FocusEvent, type KeyboardEvent } from 'react';
import { formatNumber } from '../format';
import { ROW_HEIGHT_CLASSES, TABLE_TEXT_CLASSES, useTableDensity, type TableDensity } from './table-density';

/*
 * CMP-13: EditableGrid（Excelライク二次元数値入力）
 * 予算・計画値などの数値マトリクスをセル単位で編集する。
 * - クリックまたはフォーカスで編集開始（フォーカス時に全選択）
 * - Enter=下 / Tab=右（ブラウザ既定） / 矢印キー=上下左右 でセル間移動
 * - Ctrl/Cmd+C: フォーカスセルの生値（桁区切りなし）をクリップボードへコピー
 * - Ctrl/Cmd+V: TSV/CSV をフォーカスセル起点で展開して貼り付け。
 *   グリッド範囲を超える分は切り捨て、数値化できないセルはスキップする
 * - 非編集時は formatNumber による右寄せ tabular-nums 表示
 * - 行ヘッダ列は横スクロール時も sticky で固定
 * - density（standard / comfortable / dense）で行高と文字サイズが連動。既定は TableDefaultsProvider
 * - 入力欄の幅は列内で最も長い値（編集中の入力を含む）に追従し、桁が増えても切れない
 * - rowTotals / colTotals で合計行・合計列（太字・surface-tertiary）を表示
 * - role=grid + aria-rowindex/aria-colindex を付与（ヘッダ行・ヘッダ列を含む 1 始まり）
 */

export interface EditableGridProps {
  rowHeaders: string[];
  colHeaders: string[];
  /** rowHeaders.length × colHeaders.length の数値行列 */
  values: number[][];
  onChange: (row: number, col: number, value: number) => void;
  rowTotals?: boolean;
  colTotals?: boolean;
  /** 行密度。省略時は TableDefaultsProvider の既定（無ければ standard） */
  density?: TableDensity;
}

interface EditState {
  r: number;
  c: number;
  text: string;
}

/** 貼り付けテキストを行×列の文字列行列へ分解する（タブがあれば TSV、無ければ CSV） */
function parseClipboardMatrix(text: string): string[][] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  const delimiter = text.includes('\t') ? '\t' : ',';
  return lines.map((line) => line.split(delimiter));
}

/** セル文字列を数値化する。数値にならない場合は null（貼り付け時はスキップ） */
function parseCellNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

const LINE = 'border border-border-strong';
const HEADER_CELL = `${LINE} bg-surface-secondary px-3 text-xs font-medium text-foreground-tertiary`;
const TOTAL_CELL = `${LINE} bg-surface-tertiary px-2 text-right font-bold tabular-nums text-foreground`;
/** 入力欄の最小文字数（空・小さい値でも列が潰れないように） */
const MIN_CELL_CHARS = 6;

export function EditableGrid({
  rowHeaders,
  colHeaders,
  values,
  onChange,
  rowTotals = false,
  colTotals = false,
  density: densityProp,
}: EditableGridProps) {
  const density = useTableDensity(densityProp);
  const rowH = ROW_HEIGHT_CLASSES[density];
  const bodyText = TABLE_TEXT_CLASSES[density];
  const [edit, setEdit] = useState<EditState | null>(null);
  const cellRefs = useRef(new Map<string, HTMLInputElement>());
  /** フォーカス後にユーザー入力があったか（遅延全選択が先行入力を消さないための旗） */
  const typedSinceFocusRef = useRef(false);

  const rowCount = rowHeaders.length;
  const colCount = colHeaders.length;

  /** 行列の欠損・NaN は 0 として扱う */
  const cellValue = (r: number, c: number): number => {
    const v = values[r]?.[c];
    return typeof v === 'number' && Number.isFinite(v) ? v : 0;
  };
  const rowTotal = (r: number): number => colHeaders.reduce((sum, _col, c) => sum + cellValue(r, c), 0);
  const colTotal = (c: number): number => rowHeaders.reduce((sum, _row, r) => sum + cellValue(r, c), 0);
  const grandTotal = rowHeaders.reduce((sum, _row, r) => sum + rowTotal(r), 0);

  /* aria-rowindex/colindex はヘッダ行・ヘッダ列・合計行列を含めた 1 始まり */
  const ariaRowCount = 1 + rowCount + (colTotals ? 1 : 0);
  const ariaColCount = 1 + colCount + (rowTotals ? 1 : 0);

  /** 列ごとの最長文字数（表示値・編集中テキストの長い方）。入力欄の最小幅に使う */
  const colChars = colHeaders.map((_col, c) =>
    rowHeaders.reduce((max, _row, r) => {
      const shown = edit && edit.r === r && edit.c === c ? edit.text : formatNumber(cellValue(r, c));
      return Math.max(max, shown.length);
    }, MIN_CELL_CHARS),
  );

  const registerCell = (r: number, c: number) => (el: HTMLInputElement | null) => {
    const key = `${r}:${c}`;
    if (el) cellRefs.current.set(key, el);
    else cellRefs.current.delete(key);
  };

  /** 編集開始: 現在値を素の数字で表示し全選択（上書き入力しやすくする） */
  const handleFocus = (r: number, c: number) => (e: FocusEvent<HTMLInputElement>) => {
    typedSinceFocusRef.current = false;
    setEdit({ r, c, text: String(cellValue(r, c)) });
    const input = e.currentTarget;
    // クリック選択の解除を避けるため全選択は次フレームへ遅延する。
    // その間に入力・フォーカス移動があった場合は選択しない（先行入力を消さない）
    requestAnimationFrame(() => {
      if (input.ownerDocument.activeElement === input && !typedSinceFocusRef.current) input.select();
    });
  };

  /** 編集確定: blur 時にパースして通知（Tab 移動もここで確定される） */
  const handleBlur = () => {
    if (edit) {
      const parsed = Number(edit.text.replace(/,/g, ''));
      if (Number.isFinite(parsed) && parsed !== cellValue(edit.r, edit.c)) {
        onChange(edit.r, edit.c, parsed);
      }
    }
    setEdit(null);
  };

  /** TSV/CSV 貼り付け: フォーカスセル起点で展開。範囲外は切り捨て、数値以外はスキップ */
  const handlePaste = (r: number, c: number) => (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text/plain') || e.clipboardData.getData('text');
    if (text === '') return;
    e.preventDefault();
    typedSinceFocusRef.current = true;
    const matrix = parseClipboardMatrix(text);
    let focusedText: string | null = null;
    matrix.forEach((cells, i) => {
      const tr = r + i;
      if (tr >= rowCount) return; // 下端でクランプ
      cells.forEach((cell, j) => {
        const tc = c + j;
        if (tc >= colCount) return; // 右端でクランプ
        const parsed = parseCellNumber(cell);
        if (parsed === null) return; // 数値以外はスキップ
        onChange(tr, tc, parsed);
        if (tr === r && tc === c) focusedText = String(parsed);
      });
    });
    // フォーカス中セルの編集テキストを貼り付け結果に同期し、blur での二重確定を防ぐ
    setEdit(focusedText === null ? null : { r, c, text: focusedText });
  };

  const handleKeyDown = (r: number, c: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
      // フォーカスセルの生値（桁区切りなし）をコピーする。編集中は編集テキストを優先
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        e.preventDefault();
        const text = edit && edit.r === r && edit.c === c ? edit.text : String(cellValue(r, c));
        void navigator.clipboard.writeText(text);
      }
      return;
    }
    const moves: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
      Enter: [1, 0],
    };
    const move = moves[e.key];
    if (move) {
      e.preventDefault();
      const nr = Math.min(Math.max(r + move[0], 0), rowCount - 1);
      const nc = Math.min(Math.max(c + move[1], 0), colCount - 1);
      if (nr === r && nc === c) {
        // 端で行き先がない場合、Enter は確定だけ行う
        if (e.key === 'Enter') e.currentTarget.blur();
        return;
      }
      // フォーカス移動で旧セルの blur → 確定が走る
      cellRefs.current.get(`${nr}:${nc}`)?.focus();
    } else if (e.key === 'Escape') {
      // 編集を破棄して元の値に戻す
      setEdit(null);
    }
  };

  return (
    <div className="overflow-x-auto rounded-md border border-border-strong bg-surface">
      <table role="grid" aria-rowcount={ariaRowCount} aria-colcount={ariaColCount} className={`w-max border-collapse ${bodyText}`}>
        <thead>
          <tr aria-rowindex={1}>
            <th scope="col" aria-colindex={1} className={`${HEADER_CELL} ${rowH} sticky left-0 z-10 min-w-24`} />
            {colHeaders.map((col, c) => (
              <th key={c} scope="col" aria-colindex={c + 2} className={`${HEADER_CELL} ${rowH} min-w-24 text-right`}>
                {col}
              </th>
            ))}
            {rowTotals && (
              <th
                scope="col"
                aria-colindex={colCount + 2}
                className={`${HEADER_CELL} ${rowH} min-w-24 bg-surface-tertiary text-right font-bold text-foreground`}
              >
                合計
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rowHeaders.map((rowLabel, r) => (
            <tr key={r} aria-rowindex={r + 2}>
              <th
                scope="row"
                aria-colindex={1}
                className={`${HEADER_CELL} ${rowH} sticky left-0 z-10 whitespace-nowrap text-left text-foreground-secondary`}
              >
                {rowLabel}
              </th>
              {colHeaders.map((colLabel, c) => {
                const isEditing = edit !== null && edit.r === r && edit.c === c;
                return (
                  <td key={c} role="gridcell" aria-colindex={c + 2} className={`${LINE} ${rowH} min-w-24 p-0`}>
                    <input
                      ref={registerCell(r, c)}
                      type="text"
                      inputMode="decimal"
                      aria-label={`${rowLabel} ${colLabel}`}
                      className={`${rowH} w-full bg-transparent px-2 text-right ${bodyText} tabular-nums text-foreground outline-none focus:bg-primary-lightest focus:ring-2 focus:ring-inset focus:ring-border-focus`}
                      style={{ minWidth: `calc(${colChars[c]}ch + 1rem)` }}
                      value={isEditing ? edit.text : formatNumber(cellValue(r, c))}
                      onFocus={handleFocus(r, c)}
                      onBlur={handleBlur}
                      onChange={(e) => {
                        typedSinceFocusRef.current = true;
                        setEdit({ r, c, text: e.currentTarget.value });
                      }}
                      onKeyDown={handleKeyDown(r, c)}
                      onPaste={handlePaste(r, c)}
                    />
                  </td>
                );
              })}
              {rowTotals && (
                <td role="gridcell" aria-colindex={colCount + 2} className={`${TOTAL_CELL} ${rowH}`}>
                  {formatNumber(rowTotal(r))}
                </td>
              )}
            </tr>
          ))}
        </tbody>
        {colTotals && (
          <tfoot>
            <tr aria-rowindex={rowCount + 2}>
              <th
                scope="row"
                aria-colindex={1}
                className={`${HEADER_CELL} ${rowH} sticky left-0 z-10 bg-surface-tertiary text-left font-bold text-foreground`}
              >
                合計
              </th>
              {colHeaders.map((_colLabel, c) => (
                <td key={c} role="gridcell" aria-colindex={c + 2} className={`${TOTAL_CELL} ${rowH}`}>
                  {formatNumber(colTotal(c))}
                </td>
              ))}
              {rowTotals && (
                <td role="gridcell" aria-colindex={colCount + 2} className={`${TOTAL_CELL} ${rowH}`}>
                  {formatNumber(grandTotal)}
                </td>
              )}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
