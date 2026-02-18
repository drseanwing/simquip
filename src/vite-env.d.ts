/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV: string
  readonly VITE_POWER_PLATFORM_ENV_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
