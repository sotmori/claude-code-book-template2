import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { formatNumber } from '../format';

/*
 * CMP-03: ChartFrame + BarChart / LineChart / DonutChart
 * 純粋なインライン SVG によるチャート部品（ライブラリ不使用）。
 * 系列色は chart-1..8 トークンを系列順に固定で割り当てる（DT-01）。
 * 数値の直接指定は動的に計算する座標のみ許可（CONTRACTS.md 例外規定）。
 * 各 SVG は role="img" とし、ChartFrame の title と系列名から読み上げ名を組み立てる。
 *
 * BarChart / LineChart はコンテナの実幅（px）で描画する。固定 viewBox を w-full で
 * 引き伸ばすと文字・線幅までカード幅に追従するため。高さは 260px 固定。
 * Y 軸の左余白は目盛ラベルの幅から算出する（固定値だと 1,000,000 以上で先頭桁が切れる）。
 */

/* 系列順に固定のトークンクラス（Tailwind JIT 検出のため完全なリテラルで列挙） */
const SERIES_FILL = [
  'fill-chart-1',
  'fill-chart-2',
  'fill-chart-3',
  'fill-chart-4',
  'fill-chart-5',
  'fill-chart-6',
  'fill-chart-7',
  'fill-chart-8',
] as const;

const SERIES_STROKE = [
  'stroke-chart-1',
  'stroke-chart-2',
  'stroke-chart-3',
  'stroke-chart-4',
  'stroke-chart-5',
  'stroke-chart-6',
  'stroke-chart-7',
  'stroke-chart-8',
] as const;

const LEGEND_BG = [
  'bg-chart-1',
  'bg-chart-2',
  'bg-chart-3',
  'bg-chart-4',
  'bg-chart-5',
  'bg-chart-6',
  'bg-chart-7',
  'bg-chart-8',
] as const;

/* ── ChartFrame ─────────────────────────────────────────── */

/** ChartFrame 配下のチャートへタイトルを引き渡す（SVG の aria-label 用） */
const ChartTitleContext = createContext<string | null>(null);

/**
 * SVG の読み上げ名。ChartFrame 内では「タイトルの◯◯グラフ（系列…）」、
 * 単体では「◯◯グラフ（系列…）」となる。
 */
function useChartLabel(kind: string, names: string[]): string {
  const frameTitle = useContext(ChartTitleContext);
  const base = frameTitle ? `${frameTitle}の${kind}` : kind;
  return names.length > 0 ? `${base}（${names.join('、')}）` : base;
}

export interface ChartFrameProps {
  title: string;
  /** 期間・単位などの補足キャプション */
  caption?: string;
  /** 系列名。指定時は chart-1.. の順で凡例を描画する */
  series?: string[];
  children: ReactNode;
}

export function ChartFrame({ title, caption, series, children }: ChartFrameProps) {
  return (
    <figure className="rounded-md border border-border-strong/60 bg-surface p-4 shadow-1">
      <figcaption className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <span>
          <span className="block text-sm font-semibold text-foreground">{title}</span>
          {caption && <span className="mt-0.5 block text-xs text-foreground-tertiary">{caption}</span>}
        </span>
        {series && series.length > 0 && (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {series.map((name, i) => (
              <span key={name} className="flex items-center gap-1.5 text-xs text-foreground-secondary">
                <span
                  aria-hidden="true"
                  className={`inline-block h-2.5 w-2.5 rounded-full ${LEGEND_BG[i % LEGEND_BG.length]}`}
                />
                {name}
              </span>
            ))}
          </span>
        )}
      </figcaption>
      <ChartTitleContext.Provider value={title}>{children}</ChartTitleContext.Provider>
    </figure>
  );
}

/* ── 直交座標チャート共通（BarChart / LineChart）──────────── */

const H = 260;
/** 実幅が取れるまで（初回描画・ResizeObserver の無い環境）に使う幅 */
const DEFAULT_W = 720;
const PAD = { top: 12, right: 12, bottom: 30 } as const;
const PLOT_H = H - PAD.top - PAD.bottom;
const TICK_COUNT = 4;
/** Y 目盛ラベル右端と軸の間隔 */
const TICK_GAP = 8;
/** X ラベル同士の最低間隔 */
const LABEL_GAP = 8;
/** 軸ラベルの font-size（text-xs）。幅の見積もりに使う */
const AXIS_FONT_SIZE = 12;

/**
 * 軸ラベル幅の見積もり（px）。実測はせず、和文システムフォント（Hiragino / Yu Gothic /
 * Meiryo）の広い側に寄せた係数で見積もる: 全角 1.0em・数字英字 0.7em・区切り記号 0.35em。
 */
function estimateTextWidth(text: string): number {
  let em = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x2e80) em += 1;
    else if (',.:/- '.includes(ch)) em += 0.35;
    else em += 0.7;
  }
  return em * AXIS_FONT_SIZE;
}

/** 要素の実幅（px）。ResizeObserver で追従し、取得できるまでは DEFAULT_W */
function useElementWidth(): [RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(DEFAULT_W);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = Math.round(el.getBoundingClientRect().width);
      if (w > 0) setWidth(w);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

interface CartesianLayout {
  width: number;
  /** Y 目盛ラベル幅から算出した左余白 */
  left: number;
  plotW: number;
  /** データ 1 点あたりの横幅 */
  slotW: number;
  /** X ラベルを何点おきに表示するか（重なる場合に間引く） */
  xStep: number;
}

/** 目盛間隔をキリのよい数値に丸める（1・1.2・1.5・2・2.5・3・4・5・6・8×10^n） */
function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / exp;
  const candidates = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const nice = candidates.find((c) => m <= c) ?? 10;
  return nice * exp;
}

function scaleMax(values: number[]): number {
  // NaN / Infinity は無視してスケールを決める（データ欠損対策）
  const maxValue = values.reduce((acc, v) => (Number.isFinite(v) && v > acc ? v : acc), 0);
  return niceStep(maxValue / TICK_COUNT) * TICK_COUNT;
}

function tickValues(max: number): number[] {
  return Array.from({ length: TICK_COUNT }, (_, i) => (max * (i + 1)) / TICK_COUNT);
}

function cartesianLayout(width: number, max: number, xLabels: string[]): CartesianLayout {
  const yLabelW = tickValues(max)
    .map((t) => estimateTextWidth(formatNumber(t)))
    .reduce((acc, w) => Math.max(acc, w), estimateTextWidth('0'));
  const left = Math.ceil(yLabelW) + TICK_GAP;
  const plotW = Math.max(width - left - PAD.right, 0);
  const slotW = xLabels.length > 0 ? plotW / xLabels.length : plotW;
  const xLabelW = xLabels.reduce((acc, l) => Math.max(acc, estimateTextWidth(l)), 0);
  const xStep = slotW > 0 ? Math.max(1, Math.ceil((xLabelW + LABEL_GAP) / slotW)) : 1;
  return { width, left, plotW, slotW, xStep };
}

/** 0 起点の縦座標。負数・非有限値は 0 に丸めてプロット外への描画を防ぐ */
function yPos(value: number, max: number): number {
  const v = Number.isFinite(value) ? Math.max(0, value) : 0;
  return PAD.top + PLOT_H - (max > 0 ? (v / max) * PLOT_H : 0);
}

/** 値グリッド線（4本）＋Y目盛＋X軸ベースライン */
function CartesianAxes({ max, layout }: { max: number; layout: CartesianLayout }) {
  const { left, width } = layout;
  const right = width - PAD.right;
  return (
    <g>
      {tickValues(max).map((t) => (
        <g key={t}>
          <line
            x1={left}
            x2={right}
            y1={yPos(t, max)}
            y2={yPos(t, max)}
            strokeWidth={1}
            className="stroke-border-strong/40"
          />
          <text
            x={left - TICK_GAP}
            y={yPos(t, max)}
            textAnchor="end"
            dominantBaseline="central"
            className="fill-foreground-tertiary text-xs"
          >
            {formatNumber(t)}
          </text>
        </g>
      ))}
      <text
        x={left - TICK_GAP}
        y={yPos(0, max)}
        textAnchor="end"
        dominantBaseline="central"
        className="fill-foreground-tertiary text-xs"
      >
        0
      </text>
      {/* 軸ベースライン */}
      <line
        x1={left}
        x2={right}
        y1={PAD.top + PLOT_H}
        y2={PAD.top + PLOT_H}
        strokeWidth={1}
        className="stroke-border-strong"
      />
    </g>
  );
}

/* ── BarChart ───────────────────────────────────────────── */

export interface BarChartProps {
  data: { label: string; values: number[] }[];
  series: string[];
}

/** 上端のみ角丸（データ端 4px）・ベースライン側は直角のバーパス */
function topRoundedBar(x: number, y: number, w: number, h: number): string {
  if (h <= 0 || w <= 0) return '';
  const r = Math.min(4, w / 2, h);
  return [
    `M${x},${y + h}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `H${x + w - r}`,
    `Q${x + w},${y} ${x + w},${y + r}`,
    `V${y + h}`,
    'Z',
  ].join(' ');
}

export function BarChart({ data, series }: BarChartProps) {
  const label = useChartLabel('棒グラフ', series);
  const [ref, width] = useElementWidth();
  const max = scaleMax(data.flatMap((d) => d.values));
  const layout = cartesianLayout(width, max, data.map((d) => d.label));
  const { left, slotW, xStep } = layout;
  const gap = 2; // 隣接バー間のサーフェス色ギャップ
  const seriesCount = Math.max(series.length, 1);
  const barW = Math.min(24, (slotW * 0.7 - gap * (seriesCount - 1)) / seriesCount);
  const groupW = barW * seriesCount + gap * (seriesCount - 1);

  return (
    <div ref={ref} className="w-full">
      <svg viewBox={`0 0 ${width} ${H}`} height={H} role="img" aria-label={label} className="w-full">
        <CartesianAxes max={max} layout={layout} />
        {data.map((d, di) => {
          const slotX = left + slotW * di;
          const groupX = slotX + (slotW - groupW) / 2;
          return (
            <g key={d.label}>
              {d.values.map((v, si) => {
                const y = yPos(v, max);
                const h = PAD.top + PLOT_H - y;
                const path = topRoundedBar(groupX + si * (barW + gap), y, barW, h);
                // 高さ0（値0・負数・非有限値）のバーは描画しない
                if (!path) return null;
                return (
                  <path
                    key={series[si] ?? si}
                    d={path}
                    className={`${SERIES_FILL[si % SERIES_FILL.length]} transition-opacity duration-fast hover:opacity-75`}
                  >
                    <title>{`${d.label} ${series[si] ?? ''}: ${formatNumber(v)}`}</title>
                  </path>
                );
              })}
              {di % xStep === 0 && (
                <text
                  x={slotX + slotW / 2}
                  y={H - 8}
                  textAnchor="middle"
                  className="fill-foreground-tertiary text-xs"
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ── LineChart ──────────────────────────────────────────── */

export interface LineChartProps {
  data: { label: string; values: number[] }[];
  series: string[];
}

export function LineChart({ data, series }: LineChartProps) {
  const label = useChartLabel('折れ線グラフ', series);
  const [ref, width] = useElementWidth();
  const max = scaleMax(data.flatMap((d) => d.values));
  const layout = cartesianLayout(width, max, data.map((d) => d.label));
  const { left, slotW, xStep } = layout;
  const xPos = (i: number) => left + slotW * (i + 0.5);

  return (
    <div ref={ref} className="w-full">
      <svg viewBox={`0 0 ${width} ${H}`} height={H} role="img" aria-label={label} className="w-full">
        <CartesianAxes max={max} layout={layout} />
        {data.map(
          (d, i) =>
            i % xStep === 0 && (
              <text
                key={d.label}
                x={xPos(i)}
                y={H - 8}
                textAnchor="middle"
                className="fill-foreground-tertiary text-xs"
              >
                {d.label}
              </text>
            ),
        )}
        {series.map((name, si) => {
          const points = data.map((d, i) => {
            const raw = d.values[si];
            const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
            return { x: xPos(i), y: yPos(value, max), label: d.label, value };
          });
          const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
          return (
            <g key={name}>
              <path
                d={path}
                fill="none"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                className={SERIES_STROKE[si % SERIES_STROKE.length]}
              />
              {points.map((p) => (
                <g key={p.label}>
                  <title>{`${p.label} ${name}: ${formatNumber(p.value)}`}</title>
                  {/* 拡大ヒットエリア（マーカーより広くとる） */}
                  <circle cx={p.x} cy={p.y} r={12} className="fill-transparent" />
                  {/* マーカー: サーフェス色の 2px リングで線との交差を分離 */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={4}
                    strokeWidth={2}
                    className={`${SERIES_FILL[si % SERIES_FILL.length]} stroke-surface`}
                  />
                </g>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ── DonutChart ─────────────────────────────────────────── */

export interface DonutChartProps {
  data: { label: string; value: number }[];
}

const DONUT_W = 300;
const DONUT_H = 240;
const CX = DONUT_W / 2;
const CY = DONUT_H / 2;
const R_OUT = 92;
const R_IN = 58;

function polar(r: number, angle: number): [number, number] {
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)];
}

/** 環状セグメントのパス（a0→a1、ラジアン） */
function donutSegment(a0: number, a1: number): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = polar(R_OUT, a0);
  const [x1, y1] = polar(R_OUT, a1);
  const [x2, y2] = polar(R_IN, a1);
  const [x3, y3] = polar(R_IN, a0);
  return [
    `M${x0},${y0}`,
    `A${R_OUT},${R_OUT} 0 ${large} 1 ${x1},${y1}`,
    `L${x2},${y2}`,
    `A${R_IN},${R_IN} 0 ${large} 0 ${x3},${y3}`,
    'Z',
  ].join(' ');
}

/** ドーナツの構成比計算に使う値（負数・非有限値は 0 扱い） */
function donutValue(value: number): number {
  return Number.isFinite(value) ? Math.max(value, 0) : 0;
}

export function DonutChart({ data }: DonutChartProps) {
  const label = useChartLabel(
    'ドーナツグラフ',
    data.map((d) => d.label),
  );
  const total = data.reduce((sum, d) => sum + donutValue(d.value), 0);
  const gapAngle = 2 / R_OUT; // 外周で約2pxのサーフェス色ギャップ

  let angle = -Math.PI / 2; // 12時位置から時計回り
  const segments = data.map((d, i) => {
    const share = total > 0 ? donutValue(d.value) / total : 0;
    const a0 = angle;
    const a1 = angle + share * Math.PI * 2;
    angle = a1;
    return { ...d, index: i, share, a0, a1 };
  });

  return (
    <svg viewBox={`0 0 ${DONUT_W} ${DONUT_H}`} role="img" aria-label={label} className="mx-auto w-full max-w-xs">
      {segments.map((s) => {
        if (s.share <= 0) return null;
        const pad = Math.min(gapAngle / 2, (s.a1 - s.a0) / 4);
        const mid = (s.a0 + s.a1) / 2;
        const [lx, ly] = polar(R_OUT + 12, mid);
        const anchor = Math.cos(mid) > 0.25 ? 'start' : Math.cos(mid) < -0.25 ? 'end' : 'middle';
        return (
          <g key={s.label}>
            <path
              d={donutSegment(s.a0 + pad, s.a1 - pad)}
              className={`${SERIES_FILL[s.index % SERIES_FILL.length]} transition-opacity duration-fast hover:opacity-75`}
            >
              <title>{`${s.label}: ${formatNumber(s.value)}（${(s.share * 100).toFixed(1)}%）`}</title>
            </path>
            {s.share >= 0.05 && (
              <text
                x={lx}
                y={ly}
                textAnchor={anchor}
                dominantBaseline="central"
                className="fill-foreground-secondary text-xs"
              >
                {`${Math.round(s.share * 100)}%`}
              </text>
            )}
          </g>
        );
      })}
      <text x={CX} y={CY - 8} textAnchor="middle" className="fill-foreground-tertiary text-xs">
        合計
      </text>
      <text x={CX} y={CY + 12} textAnchor="middle" className="fill-foreground text-base font-semibold">
        {formatNumber(total)}
      </text>
    </svg>
  );
}
