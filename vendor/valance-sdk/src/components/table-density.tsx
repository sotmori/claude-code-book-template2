import { createContext, useContext, type ReactNode } from 'react';

/*
 * テーブル密度（DataTable / EditableGrid 共通）
 * 行高と文字サイズはトークン（--row-height-* / --table-font-size-* / --table-line-height-*）で
 * 3 段階に対応づける。既定値はアプリ単位で TableDefaultsProvider から与え、
 * 各テーブルの density プロップはその上書きとして働く。
 */

export type TableDensity = 'standard' | 'comfortable' | 'dense';

/** 行高クラス（Tailwind JIT 検出のため完全なリテラルで列挙） */
export const ROW_HEIGHT_CLASSES: Record<TableDensity, string> = {
  standard: 'h-[var(--row-height-standard)]',
  comfortable: 'h-[var(--row-height-comfortable)]',
  dense: 'h-[var(--row-height-dense)]',
};

/** 本文文字クラス。tailwind-preset.js の fontSize.table-* が font-size / line-height トークンに解決する */
export const TABLE_TEXT_CLASSES: Record<TableDensity, string> = {
  standard: 'text-table-standard',
  comfortable: 'text-table-comfortable',
  dense: 'text-table-dense',
};

const TableDensityContext = createContext<TableDensity>('standard');

export interface TableDefaultsProviderProps {
  /** density プロップを省略したテーブルに適用する密度 */
  density?: TableDensity;
  children: ReactNode;
}

/** アプリ全体のテーブル既定値。app のルート付近で 1 回だけ包む */
export function TableDefaultsProvider({ density = 'standard', children }: TableDefaultsProviderProps) {
  return <TableDensityContext.Provider value={density}>{children}</TableDensityContext.Provider>;
}

/** テーブル部品が使う密度: プロップ指定 → Provider の既定 → 'standard' */
export function useTableDensity(override?: TableDensity): TableDensity {
  const fromProvider = useContext(TableDensityContext);
  return override ?? fromProvider;
}
