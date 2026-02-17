type AppEnvironment = 'development' | 'test' | 'production'

interface AppConfig {
  env: AppEnvironment
  enableMockData: boolean
}

function getEnv(): AppEnvironment {
  const env = import.meta.env.VITE_APP_ENV as string | undefined
  if (env === 'test' || env === 'production') return env
  return 'development'
}

export const config: AppConfig = {
  env: getEnv(),
  enableMockData: import.meta.env.VITE_ENABLE_MOCK_DATA === 'true',
}

export function isDevelopment(): boolean {
  return config.env === 'development'
}

export function isProduction(): boolean {
  return config.env === 'production'
}
