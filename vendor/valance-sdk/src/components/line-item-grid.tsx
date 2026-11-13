import { useMemo } from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { Button } from './button';
import { NumberInput } from './form-field';
import { LookupField, type LookupOption } from './lookup-field';
import { AmountText } from './amount-text';
import { LABELS } from '../labels';
import { formatAmount, formatTaxRate } from '../format';

/*
 * CMP-10: LineItemGrid（伝票明細行）
 * 受注・請求などの伝票で明細行を編集する入力部品。
 * 金額は数量×単価で常に自動計算する（手入力不可）。行高は dense（32px 基準）。
 *
 * 品目の候補（itemOptions）の meta には LineItemOptionMeta 形の
 * { unit, unitPrice, taxRate } を載せる規約とし、品目選択時に行へ自動転記する。
 * meta が文字列の場合は候補リストの補足表示としてそのまま出し、コードと名称のみ転記する。
 * 数量・単価に NaN 等の不正値が渡っても金額・合計は 0 として計算する。
 * 数量・単価の入力欄は列内の最長桁数に追従して広がる（固定列幅で桁が切れない）。
 */

export interface LineItem {
  id: string;
  itemCode: string;
  itemName: string;
  qty: number;
  unit: string;
  unitPrice: number;
  /** 0.1 または 0.08 */
  taxRate: number;
}

/** itemOptions の meta に載せる自動転記用ペイロード */
export interface LineItemOptionMeta {
  unit: string;
  unitPrice: number;
  taxRate: number;
}

/**
 * 品目候補。meta は補足表示文字列（LookupField 互換）か、
 * 自動転記用の LineItemOptionMeta のどちらでもよい。
 */
export interface LineItemLookupOption {
  code: string;
  name: string;
  meta?: string | LineItemOptionMeta;
}

export interface LineItemGridProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  /** 品目検索の候補。meta に LineItemOptionMeta を載せると単位・単価・税率も転記される */
  itemOptions: LineItemLookupOption[];
}

const TAX_RATE_OPTIONS = [0.1, 0.08] as const;

/** meta から自動転記できる項目だけを実行時に安全に取り出す */
function detailsFromMeta(meta: unknown): Partial<LineItemOptionMeta> {
  if (meta === null || typeof meta !== 'object') return {};
  const m = meta as Record<string, unknown>;
  return {
    unit: typeof m.unit === 'string' ? m.unit : undefined,
    unitPrice: typeof m.unitPrice === 'number' ? m.unitPrice : undefined,
    taxRate: typeof m.taxRate === 'number' ? m.taxRate : undefined,
  };
}

/** 数量・単価の入力値: 数値化できない値・負数は 0 に丸める（min=0 と整合） */
function toNonNegativeNumber(raw: string): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** 金額 = 数量 × 単価。NaN 等の不正値は 0 として計算する */
function lineAmount(row: LineItem): number {
  const qty = Number.isFinite(row.qty) ? row.qty : 0;
  const unitPrice = Number.isFinite(row.unitPrice) ? row.unitPrice : 0;
  return qty * unitPrice;
}

/** 行ID採番（コンポーネント内での追加・複製用） */
let lineSeq = 0;
function nextLineId(): string {
  lineSeq += 1;
  return `line-${Date.now()}-${lineSeq}`;
}

function emptyLine(): LineItem {
  return { id: nextLineId(), itemCode: '', itemName: '', qty: 1, unit: '', unitPrice: 0, taxRate: 0.1 };
}

const HEADER_CELL = 'px-2 py-1.5 text-xs font-medium text-foreground-tertiary';
const BODY_CELL = 'px-1 py-0.5 align-middle';

/** 入力欄の最小幅: 桁数 + padding（px-3 = 1.5rem）・枠線・スピンボタン分 */
function digitsMinWidth(chars: number) {
  return { minWidth: `calc(${chars}ch + 3rem)` };
}

function digitsOf(n: number): number {
  return Number.isFinite(n) ? String(n).length : 1;
}

export function LineItemGrid({ items, onChange, itemOptions }: LineItemGridProps) {
  const qtyChars = Math.max(4, ...items.map((r) => digitsOf(r.qty)));
  const priceChars = Math.max(6, ...items.map((r) => digitsOf(r.unitPrice)));
  const total = items.reduce((sum, row) => sum + lineAmount(row), 0);

  /*
   * LookupField の meta は補足表示文字列。オブジェクト meta（自動転記ペイロード）は
   * そのまま渡すと表示できないため、単価・単位の表示文字列へ変換して渡す。
   */
  const displayOptions = useMemo<LookupOption[]>(
    () =>
      itemOptions.map((option) => {
        if (typeof option.meta === 'string' || option.meta === undefined) {
          return { code: option.code, name: option.name, meta: option.meta };
        }
        const detail = detailsFromMeta(option.meta);
        const metaText =
          detail.unitPrice !== undefined
            ? `${formatAmount(detail.unitPrice)}${detail.unit ? `／${detail.unit}` : ''}`
            : undefined;
        return { code: option.code, name: option.name, meta: metaText };
      }),
    [itemOptions],
  );

  const patchRow = (id: string, patch: Partial<LineItem>) => {
    onChange(items.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  /** 品目選択: コード・名称に加え、meta があれば単位・単価・税率も転記 */
  const selectItem = (id: string, code: string | null) => {
    if (code === null) {
      patchRow(id, { itemCode: '', itemName: '' });
      return;
    }
    const option = itemOptions.find((o) => o.code === code);
    const detail = detailsFromMeta(option?.meta);
    onChange(
      items.map((row) =>
        row.id === id
          ? {
              ...row,
              itemCode: code,
              itemName: option?.name ?? row.itemName,
              unit: detail.unit ?? row.unit,
              unitPrice: detail.unitPrice ?? row.unitPrice,
              taxRate: detail.taxRate ?? row.taxRate,
            }
          : row,
      ),
    );
  };

  const addRow = () => onChange([...items, emptyLine()]);

  const duplicateRow = (id: string) => {
    const index = items.findIndex((row) => row.id === id);
    if (index < 0) return;
    const copy: LineItem = { ...items[index], id: nextLineId() };
    onChange([...items.slice(0, index + 1), copy, ...items.slice(index + 1)]);
  };

  const removeRow = (id: string) => onChange(items.filter((row) => row.id !== id));

  return (
    <div className="overflow-x-auto rounded-md border border-border-strong bg-surface">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border-strong bg-surface-secondary">
            <th scope="col" className={`${HEADER_CELL} w-10 text-center`}>行No</th>
            <th scope="col" className={`${HEADER_CELL} text-left`}>品目</th>
            <th scope="col" className={`${HEADER_CELL} w-20 text-right`}>数量</th>
            <th scope="col" className={`${HEADER_CELL} w-14 text-center`}>単位</th>
            <th scope="col" className={`${HEADER_CELL} w-28 text-right`}>単価</th>
            <th scope="col" className={`${HEADER_CELL} w-28 text-left`}>税率区分</th>
            <th scope="col" className={`${HEADER_CELL} w-28 text-right`}>金額</th>
            <th scope="col" className={`${HEADER_CELL} w-20 text-center`}>行操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-tertiary">
          {items.length === 0 && (
            <tr>
              <td colSpan={8} className="px-2 py-4 text-center text-sm text-foreground-tertiary">
                {LABELS.state.empty}
              </td>
            </tr>
          )}
          {items.map((row, index) => (
            <tr key={row.id} className="hover:bg-surface-secondary">
              <td className={`${BODY_CELL} text-center text-xs tabular-nums text-foreground-tertiary`}>
                {index + 1}
              </td>
              <td className={BODY_CELL}>
                <LookupField
                  options={displayOptions}
                  value={row.itemCode || null}
                  onChange={(code) => selectItem(row.id, code)}
                  placeholder={LABELS.form.selectPlaceholder}
                />
              </td>
              <td className={BODY_CELL}>
                <NumberInput
                  aria-label={`${index + 1}行目 数量`}
                  className="h-7 w-full text-xs"
                  style={digitsMinWidth(qtyChars)}
                  value={Number.isFinite(row.qty) ? row.qty : ''}
                  min={0}
                  onChange={(e) => patchRow(row.id, { qty: toNonNegativeNumber(e.currentTarget.value) })}
                />
              </td>
              <td className={`${BODY_CELL} text-center text-xs text-foreground-secondary`}>{row.unit}</td>
              <td className={BODY_CELL}>
                <NumberInput
                  aria-label={`${index + 1}行目 単価`}
                  className="h-7 w-full text-xs"
                  style={digitsMinWidth(priceChars)}
                  value={Number.isFinite(row.unitPrice) ? row.unitPrice : ''}
                  min={0}
                  onChange={(e) => patchRow(row.id, { unitPrice: toNonNegativeNumber(e.currentTarget.value) })}
                />
              </td>
              <td className={BODY_CELL}>
                {/* 税率区分は 8%/10% の二択固定のため、dense 行に収まる小型 select を用いる */}
                <select
                  aria-label={`${index + 1}行目 税率区分`}
                  className="h-7 w-full rounded-sm border border-border-strong bg-surface px-1 text-xs text-foreground"
                  value={String(row.taxRate)}
                  onChange={(e) => patchRow(row.id, { taxRate: Number(e.currentTarget.value) })}
                >
                  {TAX_RATE_OPTIONS.map((rate) => (
                    <option key={rate} value={String(rate)}>
                      {formatTaxRate(rate)}
                    </option>
                  ))}
                </select>
              </td>
              <td className={`${BODY_CELL} text-right`}>
                <AmountText value={lineAmount(row)} size="sm" />
              </td>
              <td className={`${BODY_CELL} text-center`}>
                <div className="inline-flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 px-0"
                    aria-label={`行${index + 1}を${LABELS.action.copy}`}
                    title={`行${index + 1}を${LABELS.action.copy}`}
                    icon={<Copy size={14} />}
                    onClick={() => duplicateRow(row.id)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 px-0 text-danger hover:bg-danger-bg"
                    aria-label={`行${index + 1}を${LABELS.action.remove}`}
                    title={`行${index + 1}を${LABELS.action.remove}`}
                    icon={<Trash2 size={14} />}
                    onClick={() => removeRow(row.id)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border-strong bg-surface-secondary">
            {/* 合計金額のラベルは th[scope=row] で金額セルと関連付ける */}
            <th
              scope="row"
              colSpan={6}
              className="px-2 py-1.5 text-right text-xs font-medium text-foreground-secondary"
            >
              明細合計
            </th>
            <td className="px-1 py-1.5 text-right">
              <AmountText value={total} size="md" emphasis />
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
      <div className="border-t border-surface-tertiary px-2 py-1.5">
        <Button variant="ghost" size="sm" icon={<Plus size={14} />} onClick={addRow}>
          {LABELS.action.add}
        </Button>
      </div>
    </div>
  );
}
