You will be making a web app in react + typescript for the Valance system.

**Setup**: Save this file at the project root as `AGENTS.md`. If your tool loads
`CLAUDE.md` rather than `AGENTS.md`, also create `CLAUDE.md` at the
project root containing the single line `@AGENTS.md`. If `CLAUDE.md` already exists,
make sure it contains that line instead of replacing the file. Do not copy this guide
into `CLAUDE.md`, so that downloading a newer `AGENTS.md` updates both.

For a repository or bundled builder reference, read the supplied local guide
files and use the supplied template (the hosted builder keeps it at `/opt/template`).
The download URLs below are filled in by the documentation publisher for the
selected server; never substitute another environment when working locally.

If there is no base app, please fetch the template from the following url and extract into current folder.

https://valance.co.jp/vcaframework/template.zip

The instructions for APIs and how to interface with the Valance system can be confirmed from:

https://valance.co.jp/vcaframework/vcaguide/vcaguide.md

`vcaguide.md` is an index — it lists every endpoint and links to per-domain reference files at `https://valance.co.jp/vcaframework/vcaguide/<section>.md`. Fetch the index first to see the Section Map, then fetch only the domain files you need for the task at hand. Portal/admin operations a user performs in the UI (deploy/publish, tenant-wide groups & permissions, custom domains, own domains, the website switch, security scans, audit log, schema/table editing, marketplace install, API keys, settings) are in `host-guide.md` — the agent **relays** these to the user; they are **not** called from app code. Most apps need only two or three files. Treat the index's Section Map as the source of truth for what exists.

If the user wants a **public website** (a company homepage or other multi-page public site, with no sign-in), read `vcaguide/website.md` first. A website is built with a static site generator, not with this template, and is published as a website app.

If the user wants a **contact or inquiry form** (問い合わせフォーム) that mails submissions to one fixed address, read `vcaguide/contact-form.md`. It needs no sign-in and no backend code, and works in apps and website apps: the page posts to `/v1/public/contact`, and a person confirms the receiving address in the app's settings.


Always communicate with the user in Japanese unless another language is specifically requested by the user.

Retain the development login page only in `import.meta.env.DEV` builds. Production apps sign in through the portal hand-off; never ship a password form or refresh client. See `vcaguide/auth.md`. On an app's own domain (a client hostname such as `app.example.com`), the portal hand-off is the **only** way to sign in: password and Google logins are refused there (`vcaguide/auth.md` → "Own domains").

Read `vcaguide/groups.md` before adding access controls. For department-scoped protected records also read `vcaguide/record-groups.md`; use table `recordGroups` discovery, supply top-level `recordGroupId` on create, and never infer authorization from `data.groupId`. Fetch `/customapps/_self/me/groups` and use its `appRole` together with profile `actions` to show controls: member `actions` alone do not distinguish 閲覧 from 編集 or 管理. ACL grant objects keep `groupType`; deleting a group or saving an empty app access list never makes the app open. Guests use the portal hand-off only and cannot sign in on an app password form. App-level group management, guest invitations and app access-role configuration can be implemented inside the VCA using the permission-gated APIs in `vcaguide/groups.md`, or managed from the app settings page. Tenant-wide VCA common/global groups, core groups and guest expiry/revocation are administered in the portal.

If the project was created from an older template (it reads `localStorage.token`, decodes token claims, ships a production login page, or hard-codes `/customapps/...` paths), first bring its login, token and storage handling in line with `vcaguide/auth.md` and the current template.

The current template uses React 19, `react-router` 8 (import from `react-router`; `react-router-dom` is gone), Vite 8, TypeScript 6 and ESLint flat config (`eslint.config.js`). When upgrading an older project to it, change `react-router-dom` imports to `react-router`, remove `baseUrl` from `tsconfig.json` (TypeScript 6 rejects it; keep `paths`), replace `.eslintrc.cjs` with the template's `eslint.config.js`, and fix React 19 type errors (e.g. `useRef<T>(null)` is `RefObject<T | null>`).

When asked to implement the **new login management system**, follow the migration checklist in `vcaguide/auth.md` → "Migrating existing apps to the new login management system". Fetch the latest server guide/template and apply the changes to the app's maintained source before its next deployment.

# Static Resources

All static resources like images should use relative pathing (`./logo.png`), and the Vite `base` stays `'./'` with routes in the hash (`HashRouter`), as in the template. This works on every address an app is served from: its Valance addresses, an own domain and the on-premise appliance.

One exception: a **public single-page homepage** with path routes (`BrowserRouter`) that is launched on its own domain may build with an absolute base (`base: '/'`), so deep links such as `/blog/post-1` load their assets. Such a bundle works fully only on its own domain. Never use an absolute base for a logged-in app. Details and the routing edge cases: `vcaguide/auth.md` → "Own domains" → "Routing and the asset base".

# API Base URL

Application code never contains an API host name. All API calls go
through the `api` axios instance exported by `src/auth/auth-service.ts`, whose base is
the **same-origin path `/v1`** — the platform serves the Custom Apps API under `/v1` on
every origin that serves an app bundle (portal domain, custom-app subdomain, on-premise
appliance). Do not build API URLs by string concatenation, do not add per-environment
hosts, and do not use `fetch()` with absolute URLs for platform APIs. Static resources
stay relative (`./logo.png`); API paths are root-relative under the instance (`/auth/profile`).

For `npm run dev`, Vite proxies `/v1` to the environment named by `VITE_API_TARGET`
(see "Local development" below), so the same code runs unchanged locally.

# Content-Security-Policy

New apps are published in **strict** CSP mode: the browser only runs scripts from, and
only connects to, the app's own origin and the File Store. Build for it from the start:

- No inline `<script>` code and no `onclick=`-style attributes; put all code in bundled
  modules. A strict publish with either is refused (`CSP_PREFLIGHT_FAILED`).
- No CDN scripts, fonts or stylesheets; install them as packages so the build bundles them.
- Call external APIs through connectors (`connectors.md`), never with `fetch` to another
  host. Every publish lists hard-coded outside URLs as warnings.
- If the browser genuinely must contact an outside origin, declare it in
  `contentSecurityPolicy` in `config.json`.

Details, including the compatibility mode used by older apps: `vcaguide.md` →
"Content-Security-Policy".

# Browser APIs and secure contexts

Apps may be served over plain `http://` (on-premise appliance), where the page is
**not** a secure context. Never call secure-context-only APIs without a fallback:
`crypto.randomUUID()` (use the template's `newRecordId()` helper in
`src/lib/record-id.ts`, which falls back to `crypto.getRandomValues`),
`crypto.subtle`, `navigator.clipboard` (fall back to a textarea + `execCommand('copy')`),
service workers, geolocation. Test the production build once via `http://<lan-ip>:<port>/`,
not only `localhost` (which browsers treat as secure).

Avoid using emoji characters.  Instead prefer using icons provided by lucide-react.

# Open Source Libraries

Only allow use of 3rd party libraries if they are free open source with a license of either BSD, MIT, ISC or Apache.  The use of any other library is prohibited unless specifically approved by the user.

# Application Icon

When uploading the application, the icon will be set to "thumbnail.png" in the zip root if it exists.
Create a distinctive app-specific icon automatically for every new application. Do not ask the user to supply one. Use a simple readable symbol and colors matching the app; do not reuse the Valance logo as the app icon.
Supply a real 235 × 235 PNG as `public/thumbnail.png` so Vite copies it to the ZIP root. Keep the editable artwork in the source. Preserve an existing custom icon during edits unless the user asks to change it.
Publishing lifts the root `thumbnail.png` out of the served bundle, so it cannot be the favicon. Also ship a byte-identical copy as `public/favicon.png` and add a relative favicon link (`<link rel="icon" type="image/png" href="./favicon.png">`) in index.html; refresh the copy whenever the icon changes. Verify both the source archive and built ZIP contain both files.
In the hosted builder, draw an SVG with local shapes and render it with `node /opt/render-icon.cjs path/to/icon.svg`; the helper writes public/thumbnail.png and its public/favicon.png copy without external services.

# Design

The sample includes the default Valance brand colors as theme.css.
The user is free to customize the theme by changing this file.
The UI/UX of every app is the user's to decide — there is no mandated look, layout or
component set. Unless the user sets a direction, avoid these default looks: a cream
background, italic accent words in headlines, numbered "01/02/03" section labels,
monospace labels and pill-shaped buttons.

# Sample UI kit (`@valance/sdk`) — optional starting point

The template vendors a small sample UI kit, `@valance/sdk` (`vendor/valance-sdk`,
wired as a `file:` dependency). **It is a rough example, not a design system you must
conform to.** Treat it as a parts bin:

- **Take a look first.** `vendor/valance-sdk/MANIFEST.md` lists what is in the kit
  (a data table, form inputs, modal, tabs, a few charts, some Japanese business
  formatting helpers). If something there saves time, import it.
- **Build anything you need from scratch.** If the kit has no suitable component
  (calendar, kanban board, gantt chart, map, rich-text editor, drag-and-drop, or
  anything else), write your own — this is normal and expected, not "difficult".
  The kit's sample screens are examples, not a closed list of allowed screens.
- **Change anything you import.** Copy a kit component into `src/` and restyle or
  rewrite it, override its classes, or drop it entirely. Nothing in the kit is
  protected. You do not need to ask Valance or file any request to deviate from it.
- **Add libraries freely** as long as they meet the licence rule below (BSD / MIT /
  Apache) — date pickers, calendar libraries, charting libraries, DnD libraries,
  state management, etc. are all fine.
- The kit's docs (`DESIGN-SKILL.md`, `MANIFEST.md`) describe conventions the
  *sample* follows, such as token-based colours and Japanese formatting. Adopt the
  ones that fit the app; they are suggestions, not rules.

Two design-adjacent rules apply: keep the development-only login page (see above),
and keep any browser-API fallbacks that the on-premise `http://` case needs.

The vcaguide section `https://valance.co.jp/vcaframework/vcaguide/design-sdk.md`
describes the kit and, more usefully, the standard way to wire common screen types
(lists, document forms, CSV export, file previews, notifications) to the server APIs.
That API-wiring guidance applies whatever UI you build.

# Testing

After any code change, run these in order:

1. Auto-fix: `npm run lint:fix` (or `npx eslint . --fix`)
2. Type check: `npm run tsc` (or `npx tsc --noEmit`). It must pass with zero errors.
3. Lint: `npm run lint` (or `npx eslint .`). Fix every error before calling the task done.
4. Recheck the relevant `https://valance.co.jp/vcaframework/vcaguide/<section>.md` reference file(s) for every endpoint your code calls and ensure all API requests and expected response models comply with the specification.

# Local development

Use a Node.js release with the October 2026 Brotli decoder fix (CVE-2026-111497): 22.23.4+, 24.22.1+ or 26.12.1+. The template pins `.nvmrc` to 26.12.1, which Git builds also honour; keep a pin on one of those lines.

Run the app locally with `npm run dev` against a real environment's data:

1. `cp .env.development.example .env.development`
2. Set `VITE_API_TARGET` to the origin you open the portal on (e.g. `https://portal.example.com`,
   or an on-premise appliance such as `http://valance-op-e2fd.local`) and `VITE_APP_ID` to
   the app's UUID — its default host `a-{32 hex}.vcapp.…` carries it without dashes (write it as 8-4-4-4-12); a marketplace install's id is the installed app's id, not the listing id in its `m-…` host.
3. `npm run dev` → `http://localhost:3001`. `/v1/*` is proxied to the target, so the app's
   own login page works locally with the same credentials, and every data call uses live
   data with no CORS configuration. Nothing in `.env.development` reaches a production build.

Debugging: the browser Network tab shows every call as `/v1/...` with the platform's
`requestId` in error bodies; the portal's **Error summary** and **監査ログ** (see
`vcaguide.md → Debugging a live app`) show the server side of the same `requestId`.
Reuse the per-tab session through `getToken()` (never legacy `localStorage` credentials) instead of logging in
repeatedly. `localhost` is a secure context, so browser APIs that are unavailable over
plain `http://` on an appliance (`crypto.randomUUID`, clipboard) will work locally —
test those paths once via the appliance address too.
If you need to inspect the data storage or api call results to debug issues, control chrome directly.

Never ask the user for their username or password directly.  Test using stored JWT credentials after login.

# Deployment

If the user asks to "deploy the app", check the environemnt first.
Then please build the app and zip the contents of the dist folder so that when it is extracted it will extract the contents directly.  Eg.  Extracted path will have the index.html file.
For a website, zip the static site generator's output directory the same way (for example `public/` for Hugo, `dist/` for Astro, `out/` for a Next.js static export), with `404.html` at the root and no `database.json` or `connectors.json`; see `vcaguide/website.md`.
You do not need to confirm this action with the user.

Tell the user where this file is located.

# Portable records (default for new apps)

Use `newRecordId()` from `src/lib/record-id.ts` (also exported by `@valance/sdk`) once when preparing a new record, then persist/reuse that ID for references and retries. Never reconstruct stored IDs using the current tenant, app, host or principal. Keep `/v1` same-origin and resolve the installed app with `getAppId()`.

Use native owner metadata plus the verified current profile for access decisions. Keep historical authors separate from current ownership; never treat imported payload identity fields as credentials. For a deterministic logical-key store, persist an immutable namespace with the data and discover it only inside the verified current owner's scope. Reject ambiguous namespaces. Keep pending writes/session caches bound to the current installation and user, even when data IDs are portable.

Read `vcaguide/backup-transfer.md` before implementing storage. Include source-to-new-app transfer, owner remap, detail reads, edit/reload, history, attachment bytes, foreign-user denial and unchanged-source checks in acceptance. Existing identity-derived records require an explicit compatible source upgrade before export; do not reset or silently reseed imported data.

# Explicit Logout
Keep the template's explicit signed-out state. Revoke the app session with `/auth/logout` before clearing credentials. After a user chooses logout, show a signed-out screen and an explicit sign-in button; never immediately call the portal launch endpoint. The portal still has an SSO session and would silently sign the user back in. The signed-out state must survive a reload in the current app tab, be scoped to that app, and clear on explicit sign-in or a new valid handoff. Session expiry may still use the normal portal launch flow. Test logout → signed-out screen → reload → still signed out → explicit sign-in. Do not log the user out of the whole portal or other apps.
