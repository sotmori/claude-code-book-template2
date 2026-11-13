# @valance/sdk MANIFEST — APIサーフェス台帳

`@valance/sdk`（VCA テンプレート同梱の**サンプル UI キット**）に何が入っているかの一覧。「使えそうな部品があるか」を確かめるときに引く。**SDK は見本であり、ここに無い部品は自作してよいし、ここにある部品も自由に改造・置換してよい**。設計方針の説明は `DESIGN-SKILL.md`。

- **import**: `import { ... } from '@valance/sdk'`（単一バレル）。改造したい部品は `src/components/` から自アプリへコピーして編集する。
- CSS は `@valance/sdk/styles/tokens.css`・`@valance/sdk/styles/themes/*.css`、Tailwind プリセットは `@valance/sdk/tailwind-preset`。
- 本書の記載は `src/__tests__/manifest.test.ts`（ドリフトガード）が実エクスポートと突合する。

## クイックリファレンス（全公開エクスポート）

| export | ID/分類 | 1行説明 |
|---|---|---|
| `DataTable` | CMP-01 | 業務一覧テーブル。ソート・列フィルタ・行選択・密度3段階・loading/empty内蔵 |
| `TableDefaultsProvider` `useTableDensity` | CMP-01b | テーブル密度の既定値をアプリ単位で設定（DataTable / EditableGrid が参照） |
| `KpiCard` | CMP-02 | KPI指標カード。前期比デルタ（矢印＋符号付きテキスト） |
| `ChartFrame` | CMP-03 | チャート枠（タイトル・キャプション・凡例）。figure 要素 |
| `BarChart` | CMP-03 | 純SVG棒グラフ（複数系列グループ棒） |
| `LineChart` | CMP-03 | 純SVG折れ線グラフ（マーカー＋title ツールチップ） |
| `DonutChart` | CMP-03 | 純SVGドーナツグラフ（構成比・中央に合計） |
| `StatusBadge` | CMP-04 | STATUS辞書連動バッジ（色は辞書から決まる。独自色が要るなら自作バッジで） |
| `Timeline` | CMP-05 | 縦型の履歴・監査ログ（ol、ドット＋レール） |
| `TreeView` | CMP-06 | 階層ツリー。展開/折畳・選択・完全キーボード操作 |
| `DescriptionList` | CMP-07 | dl ベースの2カラム キー・バリュー照会グリッド |
| `FormField` | CMP-08 | ラベル＋必須＋エラー（項目直下）＋ヒントのラッパ。a11y自動配線 |
| `TextInput` `NumberInput` `SelectInput` `DateInput` `TextArea` `CheckboxInput` `RadioGroup` | CMP-08 | 入力部品一式（forwardRef・高さ38px統一） |
| `LookupField` | CMP-09 | コード＋名称のマスタ参照検索（WAI-ARIA combobox） |
| `LineItemGrid` | CMP-10 | 伝票明細行グリッド。行追加/複製/削除・金額自動計算・フッタ合計 |
| `FileDropzone` | CMP-11 | ファイル添付（D&D＋クリック選択＋一覧・削除） |
| `FilterBar` | CMP-12 | 検索条件バー（text/select/multi-select/date-range＋保存済み条件） |
| `MultiSelectDropdown` | CMP-12b | すべて選択/すべて解除付き複数選択ドロップダウン |
| `MultiSelectPanel` | CMP-12b | パネル部単体（DataTable 列フィルタと共有） |
| `EditableGrid` | CMP-13 | Excelライク二次元数値入力。矢印移動・コピー貼付・行列合計 |
| `ToastProvider` `useToast` | CMP-14 | トースト（右下積み上げ・4秒自動消滅） |
| `Alert` | CMP-14 | 画面内常駐の注意喚起（role=alert） |
| `ConfirmDialog` | CMP-15 | 破壊的操作の確認ダイアログ（destructive 対応） |
| `EmptyState` `ErrorState` `Skeleton` `SkeletonText` `PageSkeleton` | CMP-16 | CNV-01 状態表示部品 |
| `Modal` `Drawer` | CMP-17 | モーダル／右ドロワー。Escape・オーバーレイ・フォーカストラップ |
| `Tabs` | CMP-18 | 下線式タブ（件数バッジ・矢印キー移動） |
| `Pagination` | CMP-19 | ページ送り。「全123件中 1–50件を表示」表記 |
| `Stepper` | CMP-20 | ウィザード進捗の横型ステップ |
| `PageHeader` | CMP-21 | ページ見出し。パンくず・説明・右上アクション |
| `AmountText` | CMP-22 | 金額表示（右揃え等幅・負数は▲を危険色） |
| `DocumentViewer` | CMP-23 | 原本プレビュー。ズーム・回転・頁送り・％座標ハイライト・実PDF対応 |
| `ApprovalRoute` | CMP-24 | 承認経路の横型ステップ可視化（STATUS連動） |
| `TaxSummary` | CMP-25 | 小計・税率別内訳・消費税・合計＋インボイス登録番号 |
| `PeriodPicker` | CMP-26 | 会計期間（YYYY年M月度）選択＋締め表現キャプション |
| `Button` | 規約部品 | 全ボタンの唯一の実装。variant/size/loading/icon |
| `AdminShell` | SHL-01 | 管理コンソールシェル（折りたたみサイドナビ＋ヘッダ） |
| `MobileShell` | SHL-02 | 現場モバイルシェル（max-w-md・下部タブバー） |
| `PrintShell` | SHL-03 | A4印刷シェル（プレビュー＋@media print） |
| `NO_PRINT_CLASS` `PAGE_BREAK_CLASS` | SHL-03 | 印刷制御クラス定数（'no-print' / 'page-break'） |
| `formatAmount` `formatNumber` `formatDate` `formatDateTime` `formatTaxRate` `formatPeriod` `formatClosingTerms` | CNV-02 | 和式業務フォーマット関数（下記参照） |
| `LABELS` | CNV-05 | 用語・ラベル辞書（共通文言の見本。独自文言も可） |
| `STATUS` | 辞書 | ステータス語彙＋tone 対応表（StatusKey） |
| `THEMES` `applyTheme` `getStoredTheme` `initTheme` | テーマ | ホワイトレーベル・プレビュー切替 |
| `setupPdfWorker` | PDF | react-pdf ワーカー登録（起動時1回） |

---

## データ表示系

### CMP-01 `DataTable<T>`
```ts
interface DataTableColumn<T> { key: string; header: string; render?: (row: T) => ReactNode;
  sortable?: boolean; sortValue?: (row: T) => string | number;
  filterable?: boolean; filterValue?: (row: T) => string;
  align?: 'left'|'right'|'center'; width?: string /* Tailwind幅クラス例 'w-32' */ }
interface DataTableSort { key: string; dir: 'asc'|'desc' }
DataTableProps<T> { columns: DataTableColumn<T>[]; rows: T[]; rowKey: (row: T) => string;
  selectable?=false; selectedKeys?=[]; onSelectionChange?: (keys: string[]) => void;
  onRowClick?: (row: T) => void; density?: 'standard'|'comfortable'|'dense' /* 省略時は TableDefaultsProvider の既定 → 'standard' */;
  sort?: DataTableSort /* 初期ソート */; loading?=false; emptyMessage?: string }
```
- クライアントサイドのソート・フィルタ（サーバーモードは非対応）。ソートは非制御（`sort` は初期値のみ、以降ヘッダ矢印で asc→desc→解除）。
- `filterable` 列はヘッダのファネルアイコン→ポップオーバー（すべて選択/すべて解除＋値チェックボックス）。列間 AND・列内 OR。絞り込み中はファネル塗り＋件数表示。
- `loading` で Skeleton 5行、0件で `EmptyState`（列フィルタ起因の0件は「条件に一致するデータがありません」を自動優先）。
- 行選択は制御（`selectedKeys`/`onSelectionChange`）。ヘッダに全選択チェック（indeterminate 対応）。`onRowClick` 行は Enter でも発火。
- 密度は行高と本文文字サイズが連動（standard 44px/14px・comfortable 38px/13px・dense 32px/12px。トークン `--row-height-*` `--table-font-size-*` `--table-line-height-*`）。

### CMP-01b `TableDefaultsProvider` / `useTableDensity`
```ts
type TableDensity = 'standard'|'comfortable'|'dense'
TableDefaultsProviderProps { density?: TableDensity = 'standard'; children }
function useTableDensity(override?: TableDensity): TableDensity  // プロップ → Provider → 'standard'
```
- アプリのルート付近で 1 回包む。`density` を省略した DataTable / EditableGrid はこの値で描画する。各テーブルの `density` プロップは個別の上書き。
- 使用パターン: SCR-01, SCR-12

### CMP-02 `KpiCard`
```ts
{ label: string; value: ReactNode; unit?: string; delta?: number /* 前期比% */;
  icon?: ReactNode /* lucide要素 */; caption?: string }
```
- delta 正=success↑・負=danger↓・0=neutral。符号は「+8.2% / -3.1%」とテキストでも伝える。NaN/Infinity は非表示。
- value の金額は `AmountText`/`formatAmount` を経由すること。
- 使用パターン: SCR-06

### CMP-03 `ChartFrame` / `BarChart` / `LineChart` / `DonutChart`
```ts
ChartFrameProps { title: string; caption?: string; series?: string[]; children }
BarChartProps / LineChartProps { data: { label: string; values: number[] }[]; series: string[] }
DonutChartProps { data: { label: string; value: number }[] }
```
- 純SVG（ライブラリ不使用）。系列色は chart-1..8 を系列順に固定。ChartFrame の `series` が凡例を描画。
- BarChart / LineChart はコンテナの実幅で描画（高さ 260px 固定。文字・線幅はカード幅で拡縮しない）。Y軸の左余白は目盛ラベル幅から算出し、X軸ラベルは重なる場合に間引く。
- 各SVGは role="img"。ChartFrame 内では aria-label が「タイトルの◯◯グラフ（系列…）」に自動合成される。
- 負数・NaN は 0 扱い。値ツールチップは SVG `<title>`。
- 使用パターン: SCR-06

### CMP-04 `StatusBadge`
```ts
type StatusBadgeProps = ({ status: StatusKey } | { label: string; tone: StatusTone }) & { className?: string }
```
- 通常は `status` キー指定（label/tone は辞書外表示のみ）。tone→色は固定（success=ブランド緑系）。
- 使用パターン: SCR-01, SCR-02, SCR-10, SCR-11, SCR-15

### CMP-05 `Timeline`
```ts
interface TimelineItem { id: string; at: string /* ISO日時 */; actor: string; action: string;
  detail?: ReactNode; tone?: StatusTone = 'neutral' }
TimelineProps { items: TimelineItem[]; className?: string }
```
- 日時は formatDateTime で自動整形。items 0件は null（何も描画しない）。
- 使用パターン: SCR-02, SCR-05

### CMP-06 `TreeView`
```ts
interface TreeNode { id: string; label: string; icon?: ReactNode; children?: TreeNode[] }
TreeViewProps { nodes: TreeNode[]; selectedId?: string | null; onSelect?: (id: string) => void; className? }
```
- 初期は全展開。親ノードのクリックは展開切替＋選択を同時に行う。
- role=tree＋ローミングタブインデックス。↑↓移動・→展開・←折畳/親へ・Home/End・Enter/Space 選択。
- 使用パターン: 階層マスタ画面全般（SCR 主構成外）

### CMP-07 `DescriptionList`
```ts
interface DescriptionItem { label: string; value: ReactNode; span?: 1|2 }
DescriptionListProps { items: DescriptionItem[]; className? }
```
- dl/dt/dd の2カラムレスポンシブ。長い項目は `span: 2` で全幅。0件は null。
- 使用パターン: SCR-02

## 入力系

### CMP-08 `FormField` ＋ 入力部品
```ts
FormFieldProps { label: string; required?: boolean; error?: string; hint?: string;
  htmlFor?: string; children; className? }
TextInputProps / NumberInputProps / DateInputProps = InputHTMLAttributes & { error?: boolean }
SelectOption { value: string; label: string }
SelectInputProps = SelectHTMLAttributes & { options: SelectOption[]; error?; placeholder? = '選択してください' }
TextAreaProps = TextareaHTMLAttributes & { error?: boolean }  // rows 既定 3
CheckboxInputProps = InputHTMLAttributes & { label?: string }
RadioGroupProps { name: string; options: SelectOption[]; value: string; onChange: (v: string) => void; disabled? }
```
- FormField は単一の子入力部品へ id / aria-describedby / aria-invalid / aria-required を自動注入する（生の `<input>` を子にしても動く）。エラーは項目直下・danger 色（CNV-03）。
- 全入力 forwardRef・制御コンポーネント・高さ 38px（TextArea 除く）。NumberInput は右寄せ tabular-nums。
- 使用パターン: SCR-03, SCR-07, SCR-09, SCR-14

### CMP-09 `LookupField`（forwardRef）
```ts
interface LookupOption { code: string; name: string; meta?: string }
LookupFieldProps { options: LookupOption[]; value: string | null /* code */;
  onChange: (code: string | null) => void; placeholder?; error?; id?; disabled?; className?;
  'aria-label'? 'aria-labelledby'? 'aria-describedby'? 'aria-invalid'? 'aria-required'? }
```
- 入力しながらコード・名称・meta を部分一致絞り込み。選択後は「コード 名称」表示、×ボタンで解除（value=null）。
- ↑↓＋Enter 選択・Escape/外側クリックで閉じる。combobox＋aria-activedescendant パターン。
- 使用パターン: SCR-03, SCR-04

### CMP-10 `LineItemGrid`
```ts
interface LineItem { id: string; itemCode: string; itemName: string; qty: number;
  unit: string; unitPrice: number; taxRate: number /* 0.1 | 0.08 */ }
interface LineItemOptionMeta { unit: string; unitPrice: number; taxRate: number }
interface LineItemLookupOption { code: string; name: string; meta?: string | LineItemOptionMeta }
LineItemGridProps { items: LineItem[]; onChange: (items: LineItem[]) => void;
  itemOptions: LineItemLookupOption[] }
```
- 金額＝数量×単価の自動計算（手入力不可）。フッタに明細合計。行追加・複製・削除ボタン内蔵。
- itemOptions の meta にオブジェクト（LineItemOptionMeta）を載せると品目選択時に単位・単価・税率を自動転記。
- 税率は 10%/8%（軽減）の二択。行高 dense（32px 基準）。
- 使用パターン: SCR-04

### CMP-11 `FileDropzone`
```ts
{ files: File[]; onChange: (files: File[]) => void; accept?: string; multiple?=true;
  disabled?; id?; className?; 'aria-describedby'? }
```
- D&D またはクリック/Enter/Space で選択、一覧に追加（アップロードはしない。親が files を保持し送信時に処理）。
- 一覧行にサイズ表示（B/KB/MB）と削除ボタン。
- 使用パターン: 添付を伴うフォーム（SCR-03 系）

### CMP-12 `FilterBar`
```ts
interface FilterDef { key: string; label: string;
  type: 'text'|'select'|'multi-select'|'date-range'; options?: SelectOption[] }
type FilterValues = Record<string, string | string[]>
FilterBarProps { filters: FilterDef[]; values: FilterValues; onChange: (v: FilterValues) => void;
  onSearch: () => void; onClear: () => void; savedViews?: string[];
  onSelectView?: (view: string) => void; className? }
```
- date-range の値は `${key}From` / `${key}To` の2キー、multi-select は string[]。テキスト欄で Enter → onSearch。
- ボタンは「検索する」（primary）＋「条件をクリア」（LABELS 準拠）。
- 使用パターン: SCR-01

### CMP-12b `MultiSelectDropdown` / `MultiSelectPanel`
```ts
interface MultiSelectOption { value: string; label: string }
MultiSelectDropdownProps { options; selected: string[]; onChange: (selected: string[]) => void;
  label?: string /* トリガー先頭 */; placeholder? = 'すべて'; id?; disabled?; className? }
MultiSelectPanelProps { options; selected; onChange }
```
- トリガー表示: 0件または全件選択=「すべて」、部分選択=「N件選択」。外側クリック・Escape で閉じる。
- パネル先頭に「すべて選択／すべて解除」リンク。↑↓でチェックボックス間移動。
- 使用パターン: SCR-01（FilterBar 経由・DataTable 列フィルタ）

### CMP-13 `EditableGrid`
```ts
{ rowHeaders: string[]; colHeaders: string[]; values: number[][];
  onChange: (row: number, col: number, value: number) => void;
  rowTotals?=false; colTotals?=false;
  density?: 'standard'|'comfortable'|'dense' /* 省略時は TableDefaultsProvider の既定 */ }
```
- フォーカスで編集開始（全選択）。Enter=下 / Tab=右 / 矢印キー移動、Escape で編集破棄。blur で確定。
- Ctrl/Cmd+C で生値コピー、Ctrl/Cmd+V で TSV/CSV をフォーカスセル起点に展開（範囲外切捨て・非数値スキップ）。
- 行ヘッダ列は sticky。role=grid＋aria-rowindex/colindex。合計行列は太字表示。
- 行高と文字サイズは density に連動（DataTable と同じトークン）。入力欄の幅は列内の最長値（編集中の入力を含む）に追従し、桁が増えても切れない。
- 使用パターン: SCR-08

## フィードバック系

### CMP-14 `ToastProvider` / `useToast` / `Alert`
```ts
interface ToastApi { success(message: string): void; error(message): void; info(message): void }
function useToast(): ToastApi  // ToastProvider の内側でのみ使用可（外では throw）
AlertProps { tone: 'info'|'success'|'warning'|'danger'; title?: string; children? }
```
- トーストは右下積み上げ・4秒自動消滅・ホバー/フォーカスで一時停止・手動クローズ可。error は role=alert で即時読み上げ。
- 文言は LABELS.toast（完了形・主語なし）から選ぶ。アプリルートを ToastProvider で包むこと。
- 使用パターン: SCR-03, SCR-15（擬似ミューテーション通知は全パターン共通）

### CMP-15 `ConfirmDialog`
```ts
{ open: boolean; title: string; message: ReactNode; confirmLabel: string;
  destructive?=false; onConfirm: () => void; onCancel: () => void }
```
- 破壊的・取り消せない操作の前に必ず挟む（window.alert/confirm 禁止）。定型文は LABELS.confirm。
- destructive で実行ボタンが danger になり初期フォーカスはキャンセル側。キャンセル文言は常に「取消す」。
- 使用パターン: SCR-03, SCR-05

### CMP-16 `EmptyState` / `ErrorState` / `Skeleton` / `SkeletonText` / `PageSkeleton`
```ts
EmptyStateProps { title? = 'データがありません'; description?: string; action?: ReactNode }
ErrorStateProps { title? = 'エラーが発生しました'; description? = '時間をおいて再度お試しください'; onRetry?: () => void }
SkeletonProps { className? = 'h-4 w-full' /* 形状指定 */ }
SkeletonTextProps { lines? = 3 }
PageSkeletonProps { variant?: 'table'|'detail'|'dashboard' = 'table' }
```
- CNV-01 の実体。EmptyState の action で次の行動（登録ボタン等）を案内。ErrorState は onRetry で再試行ボタン。
- PageSkeleton は画面全体（ルート Suspense フォールバック含む）、Skeleton/SkeletonText は部分、表は DataTable の loading を使う。
- 使用パターン: 全パターン共通（CNV-01）

### CMP-17 `Modal` / `Drawer`
```ts
ModalProps { open: boolean; title: string; onClose: () => void; footer?: ReactNode;
  size?: 'sm'|'md'|'lg' = 'md'; initialFocusRef?: RefObject<HTMLElement>; children? }
DrawerProps { open; title; onClose; initialFocusRef?; children? }  // 右側固定 max-w-md
```
- オーバーレイクリック・Escape で閉じる（IME 変換中の Escape は無視）。背景スクロール固定・Tab 循環のフォーカストラップ・閉時にオープナーへフォーカス復元。
- 本文があふれ、かつ本文の中にフォーカスできる要素が**無い**ときだけ、本文に `tabIndex=0` / `role="region"` / `aria-label={title}` を自動で付ける。文章だけのモーダルをキーボードで最後まで読めるようにするため（axe `scrollable-region-focusable` / WCAG 2.1.1）。入力やボタンがある本文では付かないので、余計なタブ停止は増えない。判定はウィンドウのリサイズと本文の増減で追随する。案件側で `tabIndex` を足す必要はない。
- 本文のフォーカスリングは内側（`ring-inset`）に描くので、スクロールする枠に切られない。
- 短い確認・入力=Modal、一覧を保った詳細表示=Drawer。z-modal / z-drawer。
- 使用パターン: SCR-09（ほか汎用）

## ナビゲーション系

### CMP-18 `Tabs`
```ts
interface TabDef { key: string; label: string; count?: number }
TabsProps { tabs: TabDef[]; active: string; onChange: (key: string) => void; className? }
```
- 制御コンポーネント。←→/Home/End でタブ移動（選択追従型）。count は件数バッジ＋読み上げ名に織り込み。
- 使用パターン: SCR-02

### CMP-19 `Pagination`
```ts
{ page: number /* 1始まり */; pageSize: number; total: number; onChange: (page: number) => void; className? }
```
- 「全N件中 X–Y件を表示」＋先頭/前へ/番号（省略記号）/次へ/末尾。不正値は表示上クランプ。クライアントサイド前提。
- 使用パターン: SCR-01

### CMP-20 `Stepper`
```ts
{ steps: string[]; current: number /* 0始まり。これより前は完了扱い */; className? }
```
- 完了=ブランド色＋チェック、現在=リング＋太字（aria-current="step"）、未来=グレー。範囲外 current も安全。
- 使用パターン: SCR-14

### CMP-21 `PageHeader`
```ts
{ title: string; breadcrumbs?: { label: string; to?: string }[];
  actions?: ReactNode; description?: string; className? }
```
- パンくずは react-router `Link`（to 無しは現在地表示）。actions は右寄せ（Button 等）。
- 使用パターン: SCR-01, SCR-02, SCR-11（ほぼ全画面の先頭）

## 業務特化系

### CMP-22 `AmountText`
```ts
{ value: number; unit?: boolean = true /* ¥記号 */; size?: 'sm'|'md'|'lg' = 'md';
  emphasis?=false /* font-semibold */; className? }
```
- formatAmount 準拠（負数は ▲1,234・text-danger）。常に右揃え tabular-nums。負数は「マイナス◯円」の aria-label 付き。
- 使用パターン: SCR-04, SCR-10, SCR-12, SCR-13

### CMP-23 `DocumentViewer`
```ts
interface DocHighlight { id: string; x: number; y: number; w: number; h: number /* ％座標 */; active?: boolean }
{ children?: ReactNode /* SVG領収書など */; fileUrl?: string; fileType?: 'pdf'|'image' = 'pdf';
  highlights?: DocHighlight[]; pageCount?=1; page?=1; onPageChange?: (page: number) => void; className? }
```
- 3モード: children（既定）/ fileUrl+pdf（react-pdf 実描画。事前に `setupPdfWorker()` 必須）/ fileUrl+image。
- ツールバー: ズーム 50–200%（25%刻み）・右90度回転・頁送り（総頁2以上で表示。PDF は読み込み結果が優先）。
- 読み込み失敗時は ErrorState＋再試行。ハイライトは active で danger 強調。
- 使用パターン: SCR-07

### CMP-24 `ApprovalRoute`
```ts
interface ApprovalStep { id: string; approver: string; role: string; status: StatusKey;
  actedAt?: string; comment?: string }
{ steps: ApprovalStep[]; className? }
```
- 状態色は STATUS の tone から確定（承認済=ブランド緑・差戻し=danger 吹き出しコメント）。承認待ち（warning）に aria-current="step"。
- 直前ステップが success のとき経路線がブランド色。0件は null。
- 使用パターン: SCR-05

### CMP-25 `TaxSummary`
```ts
interface TaxSummaryLine { taxRate: number /* 0.1 | 0.08 */; taxable: number /* 税抜 */ }
{ lines: TaxSummaryLine[]; invoiceNumber?: string /* T+13桁。指定時のみ表示 */; className? }
```
- 税率区分単位で集計・消費税は区分単位で四捨五入。表示順: 小計 → 税率別内訳 → 消費税合計 → 合計（税込）。
- 使用パターン: SCR-04, SCR-13

### CMP-26 `PeriodPicker`
```ts
{ value: string /* 'YYYY-MM' */; onChange: (value: string) => void; closingDay?: number; className? }
```
- 前月/翌月矢印＋formatPeriod 表示の純粋な制御部品（現在時刻に非依存）。closingDay で「20日締め」キャプション。
- 使用パターン: SCR-04, SCR-06, SCR-08

## シェル

### SHL-01 `AdminShell`
```ts
interface AdminNavItem { label: string; to: string; icon?: ReactNode; children?: AdminNavItem[] }
interface AdminShellUser { name?: string; firstName?: string; lastName?: string; email?: string }  // 構造型。アプリの User をそのまま渡せる
{ children; navItems?: AdminNavItem[] = []; title?: string = 'VCA デザインカタログ'; user?: AdminShellUser | null; onLogout?: () => void }
```
- 折りたたみ可能サイドナビ＋トップヘッダ（テーマピッカー内蔵）＋`max-w-content p-6` のコンテンツ。デスクトップファースト 1280px。
- `children` を持つ項目は専用の開閉ボタン付きサブメニューとして表示し、子ルート表示時は自動展開する。
- スキップリンク・NavLink の aria-current・nav ランドマーク。ナビ項目とアプリ名は必ずアプリ側から供給する。
- ヘッダ右のユーザーチップは `user` から描画。表示名は name → 「姓 名」 → email の順。`user` が null / 省略、または表示名を組み立てられない場合はチップを出さない（プレースホルダ名は無い）。SDK はアプリの認証層を import しない。
- `onLogout` を渡すとヘッダ右端に「ログアウト」ボタン（`LABELS.action.logout`）を描画し、クリックでそのまま呼ぶ。トークン破棄・遷移はアプリ側（テンプレートは `useAuth().logout`）。省略時はボタンを出さない。

### SHL-02 `MobileShell`
```ts
interface MobileTab { label: string; icon: ReactNode; key: string }
{ children; title: string; tabs?: MobileTab[]; activeTab?: string; onTabChange?: (key: string) => void }
```
- 中央寄せ max-w-md 縦一列。下部タブバー（3〜4件、タップ領域48px以上）。コンテンツ領域のみスクロール。使用パターン: SCR-15
- コンテンツがあふれ、かつ中にフォーカスできる要素が無いときだけ `<main>` を `tabIndex=0` にする（CMP-17 と同じ判定・同じ内側リング）。`<main>` はランドマークなので `role`/`aria-label` は付けない。

### SHL-03 `PrintShell` ＋ `NO_PRINT_CLASS` / `PAGE_BREAK_CLASS`
```ts
{ children /* A4用紙内の帳票 */; className? }
NO_PRINT_CLASS = 'no-print'   // 印刷対象外（用紙の外側でのみ使用）
PAGE_BREAK_CLASS = 'page-break' // 直後で改ページ（用紙内の帳票要素に付与）
```
- 画面ではA4（210mm・15mm余白・shadow-2）プレビュー、印刷時は用紙のみ @page A4・余白0 で出力。print.css を同梱。
- SCR-13 では AdminShell のプレビュー領域内に入れ子で使う。用紙内側に .no-print を持ち込まない。

---

## 規約モジュール

### format.ts（CNV-02 和式業務フォーマットのヘルパ）

| 関数 | シグネチャ | 出力例 |
|---|---|---|
| `formatAmount` | `(value: number, opts?: { unit?: boolean }) => string` | `¥1,234,567` / 負数 `▲¥1,234` / `unit:false` → `1,234` |
| `formatNumber` | `(value: number) => string` | `9,876,543`（数量等） |
| `formatDate` | `(value: string \| Date) => string` | `2026/07/05` |
| `formatDateTime` | `(value: string \| Date) => string` | `2026/07/05 09:03` |
| `formatTaxRate` | `(rate: number) => string` | `0.1`→`10%`・`0.08`→`8%（軽減）` |
| `formatPeriod` | `(period: string /* 'YYYY-MM' */) => string` | `2026-07`→`2026年7月度` |
| `formatClosingTerms` | `(closingDay: number, paymentMonthOffset: number, paymentDay: number) => string` | `(20,1,31)`→`20日締め翌月末払い`（31以上=末日/末払い、offset 0/1/2=当月/翌月/翌々月） |

### labels.ts（CNV-05 用語辞書）

`LABELS` は as const のネスト辞書。共通 UI 文言の見本で、使うと画面間で表記が揃う（独自文言を書いてもよい）。構造:

```ts
LABELS.action.*   // ボタン動詞: register/save/update/cancel/delete/close/approve/reject/search/
                  // clearFilter/csvExport/pdfExport/print/detail/edit/add/copy/remove/back/next/
                  // confirm/saveDraft/reconcile/withdraw → '保存する' '承認する' 等
LABELS.toast.*    // 完了形・主語なし: saved/registered/updated/deleted/approved/rejected/canceled/
                  // csvExported/pdfExported/reconciled/draftSaved → '保存しました' 等
LABELS.confirm.*  // 確認定型文: deleteTitle / deleteMessage(name) / cancelTitle / cancelMessage(name) /
                  // approveTitle / approveMessage(name)  ※Message系は (name: string) => string
LABELS.state.*    // loading/empty/emptyFiltered/error/errorRetry/noPermission
LABELS.form.*     // required/optional/requiredError(field)/selectPlaceholder
```

### status.ts（ステータス辞書。同じ状態には同じ色・同じ語）

```ts
type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger'
interface StatusDef { label: string; tone: StatusTone }
const STATUS: Record<StatusKey, StatusDef>  // type StatusKey = keyof typeof STATUS
```

| StatusKey | label / tone |
|---|---|
| `draft` 下書き / `canceled` 取消 / `inactive` 無効 | neutral |
| `submitted` 申請中 / `processing` 処理中 / `partial` 一部消込 / `ordered` 受注済 | info |
| `pending` 承認待ち / `unmatched` 未消込 / `arranging` 手配中 | warning |
| `approved` 承認済 / `completed` 完了 / `active` 有効 / `matched` 消込済 / `shipped` 出荷済 | success（ブランド緑） |
| `rejected` 差戻し / `overdue` 期限超過 | danger |

StatusBadge・ApprovalRoute・カンバン列の見本（SCR-10）はこの辞書から色と語を引く。辞書に無いステータスや独自の色分けが必要なら、辞書を拡張するか自作部品で表現する。

### theme.ts（ホワイトレーベル・プレビュー）

```ts
interface ThemeDef { key: string; label: string; previewRgb: string }
const THEMES: ThemeDef[]  // valance / crimson / azure / sumi
applyTheme(key: string): void   // <html> data-theme 付替（valance は属性なし）＋ localStorage 'vca-theme' へ永続化
getStoredTheme(): string        // 保存済みキー（未保存・不正値は 'valance'）
initTheme(): void               // 起動時に1回呼んで復元
```

### pdf.ts

```ts
setupPdfWorker(workerUrl?: string): void
```
- pdfjs の workerSrc を設定。省略時は `'./pdf.worker.min.mjs'` を未設定の場合のみ設定（冪等）。URL 指定時は常に上書き。
- **必須手順**: 各アプリは `pdfjs-dist/build/pdf.worker.min.mjs` を `public/` へコピーして自前ホストする（CDN 参照禁止）。predev/prebuild の copy スクリプト例は README 参照。

---

## トークン & テーマ（Tailwind クラスとして利用）

- **色**: `primary`（+`-hover` `-lightest` `-light` `-dark`）・`surface`（+`-secondary` `-tertiary` `-active`）・`foreground`（+`-secondary` `-tertiary` `-disabled`）・`border-strong` `border-focus`・セマンティック `danger`/`success`/`warning`/`info`（各 +`-bg` `-border`、danger のみ +`-hover`）・チャート `chart-1`..`chart-8`（系列順固定）。`bg-` `text-` `border-` `fill-` `stroke-` 等で使用。hex 直書きは lint エラー。
- **角丸**: `rounded-sm`(4px) / `rounded-md`(8px) / `rounded-lg`(12px) の3段階。
- **影**: `shadow-1`/`shadow-2`/`shadow-3`（elevation 3段階）＋ `shadow-btn-solid`/`shadow-btn-outline`（ボタン・入力欄の微小影）。
- **z-index 台帳**: `z-dropdown`(1000) < `z-drawer`(1100) < `z-modal`(1200) < `z-toast`(1300)。重なり順はここでのみ定義。
- **モーション**: `duration-fast`(150ms) / `duration-slow`(300ms) の2値のみ。
- **寸法・密度**: `max-w-content`(1280px)。テーブル密度は standard / comfortable / dense の3段階で、行高（`--row-height-*` 44/38/32px）と本文文字（`--table-font-size-*` 14/13/12px・`--table-line-height-*` 20/18/16px）を対にする。入力高 38px（`--input-height`）。既定密度はアプリ単位で `TableDefaultsProvider`。これ以外の中間値は発明しない。
- **フォント**: `font-sans` = Geist + Noto Sans JP（和文フォールバック付き）、`font-mono` = Geist Mono。

**ホワイトレーベル**: 顧客ブランド適用はトークン差し替えのみ。`styles/tokens.css` が `:root` の既定（Valance グリーン、色は `R G B` 3値でアルファ対応）。各テーマ `styles/themes/<key>.css` は `:root[data-theme='<key>']` でブランド連動トークン（`--color-primary*`・`--color-border-focus`・`--color-chart-1`）**だけ**を上書きし、セマンティック色と無彩色には触れない。コンポーネントはトークン経由でのみブランド色を参照するため、テーマCSS 1ファイルでリブランドが完結する。本番アプリは切替UIを同梱せず、顧客値をアプリ側 theme.css（tokens.css の上書き層）へ出荷する。

---

## 画面パターン台帳（SCR-01..15）

| ID | 名称 | 見本業務 | シェル | 主構成 | カタログ route |
|---|---|---|---|---|---|
| SCR-01 ★ | 一覧・検索 | 受注一覧 | SHL-01 | CMP-01, 04, 12, 19, 21 | `/patterns/scr-01` |
| SCR-02 ★ | 詳細・照会 | 取引先詳細 | SHL-01 | CMP-04, 05, 07, 18, 21 | `/patterns/scr-02` |
| SCR-03 ★ | 単票フォーム | 経費申請 | SHL-01 | CMP-08, 09, 14, 15 | `/patterns/scr-03` |
| SCR-04 ★ | 伝票フォーム | 受注入力 | SHL-01 | CMP-09, 10, 22, 25, 26 | `/patterns/scr-04` |
| SCR-05 ★ | 承認ワークフロー | 経費承認 | SHL-01 | CMP-05, 15, 24 | `/patterns/scr-05` |
| SCR-06 | ダッシュボード | 経営KPI | SHL-01 | CMP-02, 03, 26 | `/patterns/scr-06` |
| SCR-07 | 証憑ビューア・OCR確認 | 証憑OCR仕訳確認 | SHL-01 | CMP-08, 23 | `/patterns/scr-07` |
| SCR-08 | マトリクス入力 | 部門別予算入力 | SHL-01 | CMP-13, 26 | `/patterns/scr-08` |
| SCR-09 | カレンダー・予約 | 会議室予約 | SHL-01 | CMP-17, 08 | `/patterns/scr-09` |
| SCR-10 | カンバン・パイプライン | SFA商談パイプライン | SHL-01 | CMP-04, 22 | `/patterns/scr-10` |
| SCR-11 | ガント・工程 | 生産計画 | SHL-01 | CMP-04, 21 | `/patterns/scr-11` |
| SCR-12 | 消込・突合 | 入金消込 | SHL-01 | CMP-01, 22 | `/patterns/scr-12` |
| SCR-13 | 帳票プレビュー・出力 | 請求書発行 | SHL-03 | CMP-25, 22 | `/patterns/scr-13` |
| SCR-14 | ウィザード | 年末調整申告 | SHL-01 | CMP-08, 20 | `/patterns/scr-14` |
| SCR-15 | 現場タッチ操作 | 勤怠打刻 | SHL-02 | CMP-04, 14 | `/patterns/scr-15` |

★＝よく使われる5パターン。参考例であり、表に無い画面は自分で設計する（例: SCR-09 のカレンダー本体は SDK に無いので自作またはライブラリ導入）。

---

## 見本が従う慣例 digest（採用は任意）

詳細は DESIGN-SKILL.md。サンプル部品はこの方針で書かれているが、アプリ側に強制するものではない:
1. 色はトークン背景の Tailwind クラス（`theme.css` 差し替えで一括リブランドできる）
2. アイコンは lucide-react（テンプレート同梱）、絵文字は避ける
3. インライン style は動的算出の SVG・チャート・ガント座標などに限る
4. 文言は LABELS / STATUS 辞書を使うと統一感が出る
5. 一覧・照会画面は読込中 / 0件 / エラー / 権限なし の4状態を用意する（CNV-01）

**読込表示の見本**（CNV-01）: シェル・PageHeader・操作ボタンは即時描画し、データ領域はスケルトン（`PageSkeleton` / `Skeleton` / DataTable `loading`）で開始→取得完了後に実データへ差し替える。カタログの `useMockLoading` はカタログ専用のモック（`{ loading, reload }`）であり、実アプリでは同じ形の実フェッチ状態に差し替える。

## Record identity

`newRecordId(): string` allocates a random UUID using `crypto.getRandomValues` (including HTTP appliances). Persist and reuse it; never derive persistent IDs from current tenant/app/user identity. Ownership, permissions, optimistic versions and retry journals remain separate responsibilities. See `vcaguide/backup-transfer.md`.
