import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { getServiceRegistry, type ServiceRegistry } from '../services/serviceRegistry'

const ServiceContext = createContext<ServiceRegistry | null>(null)

export function ServiceProvider({ children }: { children: ReactNode }) {
  const registry = useMemo(() => getServiceRegistry(), [])

  return <ServiceContext.Provider value={registry}>{children}</ServiceContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useServices(): ServiceRegistry {
  const ctx = useContext(ServiceContext)
  if (!ctx) {
    throw new Error('useServices must be used within a ServiceProvider')
  }
  return ctx
}
