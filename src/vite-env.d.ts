/// <reference types="vite/client" />

declare const __APP_VERSION__: string
declare const __BUILD_TIME__: string

interface ImportMetaEnv {
  readonly VITE_APP_ENV: string
  readonly VITE_POWER_PLATFORM_ENV_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
