/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VOCONE_API_URL?: string
  readonly VOCONE_REFRESH_MS?: string
  readonly VITE_VOCONE_API_URL?: string
  readonly VITE_VOCONE_REFRESH_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: {
      VOCONE_API_URL?: string
      VOCONE_REFRESH_MS?: string
    }
  }
}

export {}
