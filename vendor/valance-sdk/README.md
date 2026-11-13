# @valance/sdk

A **sample UI kit** for VCA apps: design tokens, 3 application shells, a few dozen
example components, and Japanese-business conventions modules (labels / status /
format). Extracted from the design catalog (`design-catalog`), which consumes it and
doubles as its living documentation.

**This is a rough starting point, not a design system you must conform to.** App
authors and their coding agents are free — and encouraged — to restyle or rewrite any
component, build components the kit lacks (calendars, kanban boards, gantt charts,
maps, editors, …) from scratch or from a BSD/MIT/Apache-licensed library, and to
ignore the kit entirely. Look through `MANIFEST.md` for anything useful; build the
rest yourself.

VCA アプリ向けの**サンプル UI キット**。デザイントークン・3シェル・見本コンポーネント・
和式業務の規約辞書（labels / status / format）を同梱する。従うべきデザインシステムでは
なく、使えるものがあれば使い、無ければ自作するための部品集。改造・置換・不使用はすべて自由。

## What's inside

| Area | Entry | Contents |
|---|---|---|
| Components | `import { ... } from '@valance/sdk'` | CMP-01..26 + the shared `Button` (`src/components/`, single barrel). `MultiSelectDropdown` ships as CMP-12b alongside `FilterBar` |
| Shells | `'@valance/sdk'` | `AdminShell` (SHL-01 管理コンソール), `MobileShell` (SHL-02 現場モバイル), `PrintShell` (SHL-03 印刷 A4, bundles its `@media print` CSS) |
| Tokens | `'@valance/sdk/styles/tokens.css'` | DT-01..07 CSS variables on `:root` (colors as `R G B` triplets, radii, shadows, z-index, content width). Default palette = Valance green |
| Client themes | `'@valance/sdk/styles/themes/*.css'` | `crimson` / `azure` / `sumi` — brand-linked token overrides under `:root[data-theme='<key>']` |
| Tailwind preset | `'@valance/sdk/tailwind-preset'` | Binds the token variables to Tailwind classes (`bg-primary`, `shadow-2`, `z-modal`, `duration-fast`, `max-w-content`, font stacks…) |
| Conventions | `'@valance/sdk'` | `LABELS` (UI wording dictionary), `STATUS` / `StatusKey` / `StatusTone` (status vocabulary + tone), `formatAmount` / `formatNumber` / `formatDate` / `formatDateTime` / `formatTaxRate` / `formatPeriod` / `formatClosingTerms` |
| Theme runtime | `'@valance/sdk'` | `THEMES`, `applyTheme(key)`, `getStoredTheme()`, `initTheme()` — white-label preview switching (localStorage key `vca-theme`) |
| PDF | `'@valance/sdk'` | `setupPdfWorker(workerUrl?)` — registers the pdf.js worker for `react-pdf` |

Peer dependencies (supplied by the consuming app): `react` ^19, `react-dom` ^19,
`react-router` ^8 (import from `react-router`; v8 has no `react-router-dom`),
`lucide-react` >=0.400. Direct dependency: `react-pdf` (DocumentViewer), which pins
the `pdfjs-dist` it renders with.

## Manifest

[`MANIFEST.md`](./MANIFEST.md) is the machine-readable API ledger for implementers
(実装担当向けのAPIサーフェス台帳): every export with its condensed props signature,
wiring behaviors, conventions modules, token/theming summary, and the SCR-01..15
pattern table — read it instead of the component sources. A drift-guard test
(`src/__tests__/manifest.test.ts`) keeps it honest: the suite fails if any barrel
export, `STATUS` key, or pattern ID is missing from the manifest.

## Consuming the package

### A. Monorepo workspace (current mode)

The repo root (`165-apps/package.json`) declares npm workspaces
`valance-sdk` + `design-catalog`. A consuming app inside the workspace adds:

```jsonc
// package.json (app)
"dependencies": { "@valance/sdk": "*" }
```

`exports` currently points at **raw TypeScript** (`./src/index.ts`): the consumer's
bundler compiles the SDK sources directly, so the app must use Vite (or an
equivalent TS-aware bundler). No SDK build step is needed during development.

Because classes are authored in raw TS, the app's Tailwind must scan the SDK
sources too:

```js
// tailwind.config.js (app)
import valancePreset from '@valance/sdk/tailwind-preset';

export default {
  presets: [valancePreset],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../valance-sdk/src/**/*.{ts,tsx}', // SDK class names (raw-TS consumption)
  ],
};
```

**Template sync**: the VCA app template vendors this package as a `file:` dependency (`vcaframework/template/vendor/valance-sdk`); after SDK changes run `165-apps/scripts/sync-template-sdk.sh` to refresh it (the vendored `package.json` is maintained by hand and is not overwritten).

### B. Registry publishing (future mode — steps documented, not yet applied)

`npm run build` already produces a publishable output: `tsconfig.build.json`
emits ESM + `.d.ts` + declaration maps to `dist/` (tests excluded). To publish:

1. Run `npm run build` in `valance-sdk/` and confirm `dist/` is complete.
2. Flip the root export in `package.json` from raw TS to the build output:

   ```jsonc
   ".": {
     "types": "./dist/index.d.ts",
     "default": "./dist/index.js"
   }
   ```

   Keep `"./styles/*"` and `"./tailwind-preset"` as they are (plain CSS/JS,
   nothing to compile).
3. Add a `"files"` allowlist (`dist`, `styles`, `tailwind-preset.js`), remove
   `"private": true`, set the target version, and publish.
4. In consumers, change the Tailwind content glob from `../valance-sdk/src/**`
   to the installed output, e.g. `./node_modules/@valance/sdk/dist/**/*.js`.

Until those steps are performed the package stays workspace-internal.

## Quickstart (new app wiring)

1. **Tailwind preset** — as shown above (`presets: [valancePreset]` + content globs).
2. **Tokens + themes (CSS)** — import the tokens once, then any client themes the
   app needs. The catalog keeps an app-side `src/theme.css` as the per-customer
   override layer:

   ```css
   /* src/theme.css — white-label override point */
   @import '@valance/sdk/styles/tokens.css';
   /* :root { --color-primary: ...; } ← customer branding goes here, nothing else */
   ```

   ```css
   /* src/index.css */
   @import './theme.css';
   @import '@valance/sdk/styles/themes/crimson.css'; /* optional preview themes */
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

3. **Bootstrap** — restore the saved theme and register the pdf.js worker before
   first render:

   ```tsx
   // src/index.tsx
   import { initTheme, setupPdfWorker } from '@valance/sdk';

   initTheme();      // restores data-theme from localStorage ('vca-theme')
   setupPdfWorker(); // defaults to './pdf.worker.min.mjs' (idempotent)
   ```

4. **PDF worker copy step** — VCA apps self-host static resources (no CDN).
   Copy the worker from the `pdfjs-dist` that `react-pdf` resolves into `public/`
   before dev/build (the worker and API versions must match exactly); the catalog
   does it with an npm script wired to `predev`/`prebuild`:

   ```jsonc
   "copy:pdf-worker": "node -e \"const fs=require('fs'),path=require('path');const pdfjs=path.dirname(require.resolve('pdfjs-dist/package.json',{paths:[path.dirname(require.resolve('react-pdf/package.json'))]}));fs.mkdirSync('public',{recursive:true});fs.copyFileSync(path.join(pdfjs,'build/pdf.worker.min.mjs'),'public/pdf.worker.min.mjs')\""
   ```

   `setupPdfWorker('/custom/path.mjs')` overrides the URL when the app hosts it
   elsewhere.
5. **ToastProvider** — wrap any page (or the app root) that uses `useToast` in
   `ToastProvider`.

## Theming / white-label model

Customer branding = swapping token values only. Components never reference brand
colors except through tokens — that discipline is what makes one CSS file
sufficient for a rebrand.

- `styles/tokens.css` holds the full default palette on `:root`
  (`valance` green). Colors are `R G B` triplets so Tailwind alpha works.
- Each client theme (`styles/themes/<key>.css`) overrides **only** brand-linked
  variables (`--color-primary*`, `--color-border-focus`, `--color-chart-1`) under
  `:root[data-theme='<key>']`. Semantic colors (danger/success/warning/info) and
  neutrals stay untouched.
- Runtime switching is a catalog preview feature: `applyTheme(key)` sets
  `data-theme` on `<html>` (the default theme removes the attribute) and persists
  to localStorage; `initTheme()` restores it at startup. Production apps for a
  single customer ship without the switcher and instead put the customer's values
  in the app-side `theme.css` override layer.

## Conventions modules

These are the machine-readable half of the sample's conventions (CNV-02/05). Using
them keeps wording and formats consistent across screens; apps may use their own
wording and formats instead.

- **`LABELS`** — a UI wording dictionary for common button labels, toast messages,
  and state text. Everything is Japanese (完了形 toasts such as 「保存しました」, no
  vague verbs).
- **`STATUS`** — status vocabulary: each `StatusKey` fixes a word + tone pair so
  the same state always renders the same word and color (`StatusBadge`,
  `ApprovalRoute` consume it).
- **`format`** — Japanese business formatting: `¥1,234`, negatives as `▲1,234`
  (never a minus sign), dates `YYYY/MM/DD`, tax rates `8%（軽減）`, periods
  `2026年7月度`, and closing terms via `formatClosingTerms` (e.g. 20日締め翌月末払い).

## Data operations are client-side

Components perform sort / filter / pagination **in memory** (`DataTable`,
`FilterBar`, `Pagination`…). Server-mode props (server pagination, remote sorting
callbacks) are not implemented in the kit's components; an app that needs them
can copy and extend the component, or write its own.

## Testing and quality gates (SDK development repo)

These gates apply when developing the SDK package itself. Apps that vendor the kit
are not bound by them — the app template ships only `tsc` + `vite build`.

```sh
npm test            # vitest run (jsdom + Testing Library), unit tests per component
npm run test:watch  # watch mode
npm run lint        # ESLint gate
npm run tsc         # type check (strict, noEmit)
npm run build       # dist output for the future registry mode
```

The lint config is a machine-enforced gate, applied to tests as well:

- **No raw hex colors** in code — string/template literals containing hex codes
  are errors; use the tokens via Tailwind classes.
- **No icon or UI-kit imports** other than `lucide-react` — react-icons,
  heroicons, MUI, antd, Radix, Chakra, etc. are banned import patterns.
- TypeScript is strict with `noUnusedLocals` / `noUnusedParameters` on.

A change is done only when `npm test`, `npm run lint`, and `npm run tsc` all pass
with zero errors. From the workspace root, `npm run lint` / `npm run tsc` /
`npm test` fan out to all workspaces.

## Conventions the sample follows (SDK package code only)

The kit's own source is written to these rules so the catalog stays consistent.
They describe the sample; they are not requirements for apps built with it.

- UI text is Japanese and comes from `LABELS`; statuses from `STATUS`; all
  amounts/dates/rates through the format helpers.
- Design tokens only: no hex, no arbitrary px, no inline `style` except
  dynamically computed coordinates/transforms (charts, gantt, highlight rects).
- Icons: `lucide-react`. No emoji.
- No new runtime dependencies beyond the declared peer deps (inside the SDK
  package itself — apps add whatever BSD/MIT/Apache libraries they need).
