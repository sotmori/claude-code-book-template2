/*
 * CMP-01..26: 共有コンポーネント barrel
 * 画面はここから import する。テーブル・フォーム・モーダル等の自作は禁止。
 * 将来 @valance/vca-design パッケージとして切り出す抽出単位。
 */

/* データ表示 (7) */
export * from './data-table';        /* CMP-01 DataTable */
export { TableDefaultsProvider, useTableDensity, type TableDensity } from './table-density'; /* CMP-01b テーブル密度の既定値 */
export * from './kpi-card';          /* CMP-02 KpiCard */
export * from './chart-frame';       /* CMP-03 ChartFrame + BarChart/LineChart/DonutChart */
export * from './status-badge';      /* CMP-04 StatusBadge */
export * from './timeline';          /* CMP-05 Timeline */
export * from './tree-view';         /* CMP-06 TreeView */
export * from './description-list';  /* CMP-07 DescriptionList */

/* 入力 (6) */
export * from './form-field';        /* CMP-08 FormField ほか入力部品 */
export * from './lookup-field';      /* CMP-09 LookupField */
export * from './line-item-grid';    /* CMP-10 LineItemGrid */
export * from './file-dropzone';     /* CMP-11 FileDropzone */
export * from './filter-bar';        /* CMP-12 FilterBar */
export * from './multi-select';      /* CMP-12b MultiSelectDropdown（全選択/全解除付き複数選択） */
export * from './editable-grid';     /* CMP-13 EditableGrid */

/* フィードバック (4) */
export * from './toast';             /* CMP-14 ToastProvider/useToast/Alert */
export * from './confirm-dialog';    /* CMP-15 ConfirmDialog */
export * from './states';            /* CMP-16 EmptyState/ErrorState/Skeleton */
export * from './modal';             /* CMP-17 Modal/Drawer */

/* ナビゲーション (4) */
export * from './tabs';              /* CMP-18 Tabs */
export * from './pagination';        /* CMP-19 Pagination */
export * from './stepper';           /* CMP-20 Stepper */
export * from './page-header';       /* CMP-21 PageHeader */

/* 業務特化 (5) */
export * from './amount-text';       /* CMP-22 AmountText */
export * from './document-viewer';   /* CMP-23 DocumentViewer */
export * from './approval-route';    /* CMP-24 ApprovalRoute */
export * from './tax-summary';       /* CMP-25 TaxSummary */
export * from './period-picker';     /* CMP-26 PeriodPicker */

/* 共通ボタン（規約部品：画面での <button> 直書きスタイル統一用） */
export * from './button';
