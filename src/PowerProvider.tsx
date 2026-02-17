import { useState, useEffect, type ReactNode } from 'react'
import { getContext, type IContext } from '@microsoft/power-apps/app'
import { PowerContext } from './powerContext'

const INIT_TIMEOUT_MS = 10000

interface PowerProviderProps {
  children: ReactNode
}

export default function PowerProvider({ children }: PowerProviderProps) {
  const [context, setContext] = useState<IContext | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), INIT_TIMEOUT_MS)

    getContext()
      .then((ctx) => {
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
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Initializing...</p>
      </div>
    )
  }

  return <PowerContext.Provider value={context}>{children}</PowerContext.Provider>
}
