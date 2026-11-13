/* CSS を副作用として import するための型宣言（print.css 等） */
declare module '*.css';

interface ImportMetaEnv {
  readonly BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
