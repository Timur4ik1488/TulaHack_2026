/// <reference types="vite/client" />

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    /** Повтор запроса после refresh (защита от цикла). */
    _retry?: boolean
    /** Не вызывать /auth/refresh для этого запроса. */
    skipAuthRefresh?: boolean
  }
}

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_TELEGRAM_BOT_USERNAME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
