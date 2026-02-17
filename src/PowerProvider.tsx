import { useState, useEffect, createContext, useContext, type ReactNode } from 'react'
import { getContext, type IContext } from '@microsoft/power-apps/app'

const PowerContext = createContext<IContext | null>(null)

export function usePowerContext(): IContext | null {
  return useContext(PowerContext)
}

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

  return (
    <PowerContext.Provider value={context}>
      {children}
    </PowerContext.Provider>
  )
}
