import { createContext } from 'react'
import type { IContext } from '@microsoft/power-apps/app'

export const PowerContext = createContext<IContext | null>(null)
