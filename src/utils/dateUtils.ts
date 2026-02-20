import type { PMFrequency } from '../types'

/** Compute the next scheduled date based on PM frequency. */
export function computeNextPMDate(fromDate: string, frequency: PMFrequency): string {
  const d = new Date(fromDate)
  switch (frequency) {
    case 'Weekly':
      d.setDate(d.getDate() + 7)
      break
    case 'Monthly':
      d.setMonth(d.getMonth() + 1)
      break
    case 'Quarterly':
      d.setMonth(d.getMonth() + 3)
      break
    case 'SemiAnnual':
      d.setMonth(d.getMonth() + 6)
      break
    case 'Annual':
      d.setFullYear(d.getFullYear() + 1)
      break
  }
  return d.toISOString().slice(0, 10)
}
