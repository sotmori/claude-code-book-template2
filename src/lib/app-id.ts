import { getAppContext } from '../auth/app-session';

/**
 * Resolve the custom-app's appId for API URLs.
 *
 * NEVER hardcode the appId — it changes across environments and rebuilds.
 * Production derives it from the serving path, falling back to `_self` (which the
 * backend resolves via the request `Origin` header).
 *
 * For LOCAL development you can point `npm run dev` at a live environment's backend
 * by setting `VITE_APP_ID` in `.env.development` (copy `.env.development.example`).
 * That file is loaded ONLY by `vite dev` and is never bundled into a production
 * build, so deployed apps always fall through to runtime derivation.
 *
 * See vcaguide.md → "Debugging a live app → Running locally against a live backend".
 */
export function getAppId(): string {
  const override = import.meta.env.DEV ? import.meta.env.VITE_APP_ID : undefined;
  if (override) return override;
  const context = getAppContext();
  if (context) return context.appId;
  const segs = window.location.pathname.split('/').filter(Boolean);
  return segs[0] === 'customapps' && segs.length >= 3 ? segs[2] : '_self';
}
