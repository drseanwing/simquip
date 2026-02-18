import type { DataClient, IOperationResult } from '@microsoft/power-apps/data'
import { NotFoundError, TransientDependencyError } from '../errors'
import { withRetry } from '../utils/retry'
import type { DataService, ListOptions, PagedResult } from './dataService'
import type { ColumnAdapter } from './dataverseAdapters'

/**
 * Generic Dataverse implementation of {@link DataService}.
 *
 * Translates between camelCase TypeScript models and Dataverse redi_ columns,
 * converts choice integers ↔ string enums, and handles lookups.
 */
export class DataverseDataService<T extends Record<string, unknown>>
  implements DataService<T>
{
  private readonly client: DataClient
  private readonly adapter: ColumnAdapter<T>

  constructor(client: DataClient, adapter: ColumnAdapter<T>) {
    this.client = client
    this.adapter = adapter
  }

  // ── Public API ───────────────────────────────────────────────────────────

  async getAll(options?: ListOptions): Promise<PagedResult<T>> {
    return withRetry(() => this.getAllInternal(options))
  }

  async getById(id: string): Promise<T> {
    return withRetry(() => this.getByIdInternal(id))
  }

  async create(item: Partial<T>): Promise<T> {
    return withRetry(() => this.createInternal(item))
  }

  async update(id: string, item: Partial<T>): Promise<T> {
    return withRetry(() => this.updateInternal(id, item))
  }

  async delete(id: string): Promise<void> {
    return withRetry(() => this.deleteInternal(id))
  }

  // ── Internal implementations ─────────────────────────────────────────────

  private async getAllInternal(options?: ListOptions): Promise<PagedResult<T>> {
    const queryOptions = this.buildQueryOptions(options)

    const result: IOperationResult<Record<string, unknown>[]> =
      await this.client.retrieveMultipleRecordsAsync(
        this.adapter.tableName,
        queryOptions,
      )

    this.throwOnFailure(result, 'retrieveMultiple')

    const data = result.data.map((row) => this.fromDataverse(row))
    const totalCount = result.count ?? data.length
    const hasMore = !!result.skipToken

    return { data, totalCount, hasMore }
  }

  private async getByIdInternal(id: string): Promise<T> {
    const result: IOperationResult<Record<string, unknown>> =
      await this.client.retrieveRecordAsync(this.adapter.tableName, id)

    if (!result.success) {
      const status = (result.error as { status?: number } | undefined)?.status
      if (status === 404) {
        throw new NotFoundError(this.adapter.tableName, id)
      }
      this.throwOnFailure(result, 'retrieve')
    }

    return this.fromDataverse(result.data)
  }

  private async createInternal(item: Partial<T>): Promise<T> {
    const dvRecord = this.toDataverse(item)

    const result: IOperationResult<Record<string, unknown>> =
      await this.client.createRecordAsync(this.adapter.tableName, dvRecord)

    this.throwOnFailure(result, 'create')

    // After a successful create, retrieve the full record so the caller
    // gets a complete T (including server-generated fields).
    const createdId =
      (result.data as Record<string, unknown>)?.[this.adapter.idColumn] ??
      (result.data as Record<string, unknown>)?.id

    if (typeof createdId === 'string') {
      return this.getByIdInternal(createdId)
    }

    // Fallback: return what we can assemble from the input
    return { ...item, ...this.fromDataverse(result.data) } as T
  }

  private async updateInternal(id: string, item: Partial<T>): Promise<T> {
    const dvRecord = this.toDataverse(item)

    const result: IOperationResult<Record<string, unknown>> =
      await this.client.updateRecordAsync(this.adapter.tableName, id, dvRecord)

    this.throwOnFailure(result, 'update')

    return this.getByIdInternal(id)
  }

  private async deleteInternal(id: string): Promise<void> {
    const result: IOperationResult<void> = await this.client.deleteRecordAsync(
      this.adapter.tableName,
      id,
    )

    if (!result.success) {
      const status = (result.error as { status?: number } | undefined)?.status
      if (status === 404) {
        throw new NotFoundError(this.adapter.tableName, id)
      }
      this.throwOnFailure(result, 'delete')
    }
  }

  // ── Column mapping ───────────────────────────────────────────────────────

  /** Convert a Dataverse record into a TypeScript model. */
  private fromDataverse(row: Record<string, unknown>): T {
    const model: Record<string, unknown> = {}

    for (const [tsKey, dvCol] of Object.entries(this.adapter.columns)) {
      let value = row[dvCol]

      // Choice column → string enum
      const choiceMapper = this.adapter.choices?.[tsKey as keyof T & string]
      if (choiceMapper && typeof value === 'number') {
        value = choiceMapper.fromDb(value)
      }

      // Null handling for lookup columns
      if (value === undefined) value = null

      model[tsKey] = value
    }

    return model as T
  }

  /** Convert a partial TypeScript model into a Dataverse record for create/update. */
  private toDataverse(item: Partial<T>): Record<string, unknown> {
    const record: Record<string, unknown> = {}

    for (const [tsKey, value] of Object.entries(item)) {
      const dvCol = this.adapter.columns[tsKey as keyof T & string]
      if (!dvCol) continue

      // Skip the ID column on create (Dataverse auto-generates it)
      if (tsKey === this.adapter.idField) continue

      let dvValue = value

      // Choice column → integer
      const choiceMapper = this.adapter.choices?.[tsKey as keyof T & string]
      if (choiceMapper && typeof dvValue === 'string') {
        dvValue = choiceMapper.toDb(dvValue)
      }

      // Lookup columns: Dataverse expects the bind syntax for lookups,
      // but the SDK handles this via the navigation property approach.
      // For now, we set the _value column directly; if the SDK requires
      // @odata.bind we'll adapt in the lookup config.
      if (dvCol.startsWith('_') && dvCol.endsWith('_value')) {
        // Convert lookup: set the navigation property bind format
        const navProp = dvCol.slice(1, -6) // strip leading _ and trailing _value
        if (dvValue === null) {
          record[navProp] = null
        } else {
          record[dvCol] = dvValue
        }
        continue
      }

      record[dvCol] = dvValue
    }

    return record
  }

  // ── Query building ───────────────────────────────────────────────────────

  private buildQueryOptions(
    options?: ListOptions,
  ): Record<string, unknown> {
    const qo: Record<string, unknown> = { count: true }

    // Select all mapped columns
    qo.select = Object.values(this.adapter.columns)

    // Pagination
    if (options?.top) qo.top = options.top
    if (options?.skip) qo.skip = options.skip

    // Sorting
    if (options?.orderBy) {
      // Translate TS field name to Dataverse column
      const parts = options.orderBy.split(' ')
      const tsField = parts[0]
      const direction = parts[1] ?? 'asc'
      const dvCol = this.adapter.columns[tsField as keyof T & string] ?? tsField
      qo.orderBy = [`${dvCol} ${direction}`]
    }

    // Filtering
    const filters: string[] = []

    if (options?.search && this.adapter.searchFields.length > 0) {
      const term = options.search.replace(/'/g, "''")
      const searchClauses = this.adapter.searchFields.map((field) => {
        const col = this.adapter.columns[field]
        return `contains(${col},'${term}')`
      })
      filters.push(`(${searchClauses.join(' or ')})`)
    }

    if (options?.filter) {
      // Translate simple "field eq 'value'" filters
      const translated = this.translateFilter(options.filter)
      filters.push(translated)
    }

    if (filters.length > 0) {
      qo.filter = filters.join(' and ')
    }

    return qo
  }

  private translateFilter(filter: string): string {
    // Replace TS field names with Dataverse column names in simple OData expressions
    let translated = filter
    for (const [tsKey, dvCol] of Object.entries(this.adapter.columns)) {
      // Word-boundary replacement to avoid partial matches
      const regex = new RegExp(`\\b${tsKey}\\b`, 'g')
      translated = translated.replace(regex, dvCol)
    }
    return translated
  }

  // ── Error handling ───────────────────────────────────────────────────────

  private throwOnFailure(
    result: IOperationResult<unknown>,
    operation: string,
  ): void {
    if (result.success) return

    const err = result.error
    const status = (err as { status?: number } | undefined)?.status
    const message = err?.message ?? `${operation} failed on ${this.adapter.tableName}`

    // 429 or 5xx → transient, eligible for retry
    if (status && (status === 429 || status >= 500)) {
      throw new TransientDependencyError(message)
    }

    throw new Error(message)
  }
}
