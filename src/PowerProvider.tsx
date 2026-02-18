import { useState, useEffect, type ReactNode } from 'react'
import { getContext, type IContext } from '@microsoft/power-apps/app'
import { PowerContext } from './powerContext'
import SplashScreen from './components/SplashScreen'

const INIT_TIMEOUT_MS = 10000
const MIN_SPLASH_MS = 1500

interface PowerProviderProps {
  children: ReactNode
}

export default function PowerProvider({ children }: PowerProviderProps) {
  const [context, setContext] = useState<IContext | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), INIT_TIMEOUT_MS)
    const minSplash = new Promise<void>((r) => setTimeout(r, MIN_SPLASH_MS))

    Promise.all([getContext(), minSplash])
      .then(([ctx]) => {
        clearTimeout(timer)
        setContext(ctx)
      })
      .catch((err: unknown) => {
        clearTimeout(timer)
        const message = err instanceof Error ? err.message : 'Unknown initialization error'
        setError(message)
      })

    return () => clearTimeout(timer)
  }, [])

  if (error) {
    return (
      <div role="alert" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Failed to initialize</h2>
        <p>{error}</p>
        <p style={{ fontSize: '0.875rem', color: '#666' }}>
          Ensure this app is running within the Power Apps host environment.
        </p>
      </div>
    )
  }

  if (!context && timedOut) {
    return (
      <div role="alert" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Initialization timed out</h2>
        <p>The Power Apps host did not respond within {INIT_TIMEOUT_MS / 1000} seconds.</p>
        <p style={{ fontSize: '0.875rem', color: '#666' }}>
          Try refreshing the page. If the problem persists, contact your administrator.
        </p>
      </div>
    )
  }

  if (!context) {
    return <SplashScreen />
  }

  return <PowerContext.Provider value={context}>{children}</PowerContext.Provider>
}
