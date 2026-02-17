import { useState, useEffect, type ReactNode } from 'react'
import { getContext, type IContext } from '@microsoft/power-apps/app'
import { PowerContext } from './powerContext'

interface PowerProviderProps {
  children: ReactNode
}

export default function PowerProvider({ children }: PowerProviderProps) {
  const [context, setContext] = useState<IContext | null>(null)

  useEffect(() => {
    getContext().then(setContext)
  }, [])

  if (!context) {
    return <div>Loading...</div>
  }

  return <PowerContext.Provider value={context}>{children}</PowerContext.Provider>
}
