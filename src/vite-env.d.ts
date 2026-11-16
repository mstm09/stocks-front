/// <reference types="vite/client" />

// .env で設定できる値（どれも省略できる）
interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  readonly VITE_API_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
