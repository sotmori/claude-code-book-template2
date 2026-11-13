/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Dev-only appId override for testing against a live backend (see .env.development). */
  readonly VITE_APP_ID?: string;
  /** '1' only in the login-free demo build (npm run build:demo); empty otherwise. */
  readonly VITE_DEMO: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
