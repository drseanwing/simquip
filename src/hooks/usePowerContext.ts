import { useContext } from 'react'
import { PowerContext } from '../powerContext'
import type { IContext } from '@microsoft/power-apps/app'

export function usePowerContext(): IContext | null {
  return useContext(PowerContext)
}
