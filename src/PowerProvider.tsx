import { useState, useEffect, type ReactNode } from 'react'
import { getContext, type IContext } from '@microsoft/power-apps/app'
import { PowerContext } from './powerContext'

interface PowerProviderProps {
  children: ReactNode
}

export default function PowerProvider({ children }: PowerProviderProps) {
  const [context, setContext] = useState<IContext | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getContext()
      .then(setContext)
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Unknown initialization error'
        setError(message)
      })
  }, [])

  if (error) {
    return (
      <div role="alert">
        <h2>Failed to initialize</h2>
        <p>{error}</p>
      </div>
    )
  }

  if (!context) {
    return <div>Loading...</div>
  }

  return <PowerContext.Provider value={context}>{children}</PowerContext.Provider>
}
