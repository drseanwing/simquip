import { NotFoundError } from '../errors'
import type { DataService, ListOptions, PagedResult } from './dataService'

/** Simulates an async network delay. */
function delay(ms: number = 100): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Configuration for a MockDataService instance.
 *
 * @param idField   - The property name used as the primary key (e.g. 'equipmentId').
 * @param entityName - A human-readable entity label for error messages (e.g. 'Equipment').
 * @param searchFields - Array of property names to match against when a `search` option is provided.
 */
export interface MockDataServiceConfig<T> {
  idField: keyof T & string
  entityName: string
  searchFields: (keyof T & string)[]
}

/**
 * In-memory mock implementation of {@link DataService}.
 *
 * Operates on a mutable array and simulates 100ms async latency on every call.
 */
export class MockDataService<T extends Record<string, unknown>> implements DataService<T> {
  private readonly items: T[]
  private readonly config: MockDataServiceConfig<T>

  constructor(items: T[], config: MockDataServiceConfig<T>) {
    // Work on a shallow copy so callers can't silently mutate the source array.
    this.items = [...items]
    this.config = config
  }

  async getAll(options?: ListOptions): Promise<PagedResult<T>> {
    await delay()

    let result = [...this.items]

    // ── Search ──────────────────────────────────────────────────────────
    if (options?.search) {
      const term = options.search.toLowerCase()
      result = result.filter((item) =>
        this.config.searchFields.some((field) => {
          const value = item[field]
          return typeof value === 'string' && value.toLowerCase().includes(term)
        }),
      )
    }

    // ── Filter (simple "field eq value" syntax) ─────────────────────────
    if (options?.filter) {
      const match = /^(\w+)\s+eq\s+'([^']*)'$/.exec(options.filter)
      if (match) {
        const [, field, value] = match
        result = result.filter((item) => String(item[field]) === value)
      }
    }

    const totalCount = result.length

    // ── Sort ────────────────────────────────────────────────────────────
    if (options?.orderBy) {
      const parts = options.orderBy.split(' ')
      const field = parts[0]
      const descending = parts[1]?.toLowerCase() === 'desc'

      result.sort((a, b) => {
        const aVal = a[field]
        const bVal = b[field]

        if (aVal == null && bVal == null) return 0
        if (aVal == null) return 1
        if (bVal == null) return -1

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return descending ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal)
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return descending ? bVal - aVal : aVal - bVal
        }

        return 0
      })
    }

    // ── Pagination ──────────────────────────────────────────────────────
    const skip = options?.skip ?? 0
    const top = options?.top ?? result.length
    const paged = result.slice(skip, skip + top)

    return {
      data: paged,
      totalCount,
      hasMore: skip + top < totalCount,
    }
  }

  async getById(id: string): Promise<T> {
    await delay()

    const item = this.items.find((i) => i[this.config.idField] === id)
    if (!item) {
      throw new NotFoundError(this.config.entityName, id)
    }
    return { ...item }
  }

  async create(item: Partial<T>): Promise<T> {
    await delay()

    const newItem = {
      ...item,
      [this.config.idField]: crypto.randomUUID(),
    } as T

    this.items.push(newItem)
    return { ...newItem }
  }

  async update(id: string, updates: Partial<T>): Promise<T> {
    await delay()

    const index = this.items.findIndex((i) => i[this.config.idField] === id)
    if (index === -1) {
      throw new NotFoundError(this.config.entityName, id)
    }

    const updated = { ...this.items[index], ...updates }
    this.items[index] = updated
    return { ...updated }
  }

  async delete(id: string): Promise<void> {
    await delay()

    const index = this.items.findIndex((i) => i[this.config.idField] === id)
    if (index === -1) {
      throw new NotFoundError(this.config.entityName, id)
    }
    this.items.splice(index, 1)
  }
}
