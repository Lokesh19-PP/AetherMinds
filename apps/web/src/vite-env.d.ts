/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_ANCHOR_URL?: string;
  readonly VITE_WITNESS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
