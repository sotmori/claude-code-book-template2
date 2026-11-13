/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Dev-only appId override for testing against a live backend (see .env.development). */
  readonly VITE_APP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
