import type { DataClient, IOperationResult } from '@microsoft/power-apps/data'
import { NotFoundError, TransientDependencyError } from '../errors'
import { withRetry } from '../utils/retry'
import type { DataService, ListOptions, PagedResult } from './dataService'
import type { ColumnAdapter } from './dataverseAdapters'

/** The Dataverse connector data source name registered in dataSourcesInfo. */
const CONNECTOR_DATA_SOURCE = 'commondataserviceforapps'

/**
 * Dataverse organization URL. Required by the "WithOrganization" connector
 * operations to identify which Dataverse environment to target.
 */
const DATAVERSE_ORG_URL = 'https://redi.crm6.dynamics.com'

/**
 * Generic Dataverse implementation of {@link DataService}.
 *
 * Uses the connector-based `executeAsync` pattern with "WithOrganization"
 * operations (ListRecordsWithOrganization, GetItemWithOrganization, etc.)
 * routed through the `commondataserviceforapps` connector – rather than
 * direct SDK CRUD methods which require per-table entries in dataSourcesInfo.
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

  // ── Internal implementations (connector-based) ─────────────────────────

  private async getAllInternal(options?: ListOptions): Promise<PagedResult<T>> {
    const params = this.buildListParams(options)

    const result = await this.client.executeAsync<
      Record<string, unknown>,
      Record<string, unknown>
    >({
      connectorOperation: {
        tableName: CONNECTOR_DATA_SOURCE,
        operationName: 'ListRecordsWithOrganization',
        parameters: params,
      },
    })

    this.throwOnFailure(result, 'ListRecordsWithOrganization')

    // Connector ListRecords returns { value: [...rows], @odata.nextLink?, @odata.count? }
    const responseData = result.data as Record<string, unknown>
    const rows = (responseData?.value ?? result.data) as Record<string, unknown>[]
    const rowArray = Array.isArray(rows) ? rows : []

    const data = rowArray.map((row) => this.fromDataverse(row))

    const odataCount = responseData?.['@odata.count']
    const totalCount = typeof odataCount === 'number' ? odataCount : (result.count ?? data.length)
    const hasMore = !!responseData?.['@odata.nextLink'] || !!result.skipToken

    return { data, totalCount, hasMore }
  }

  private async getByIdInternal(id: string): Promise<T> {
    const result = await this.client.executeAsync<
      Record<string, unknown>,
      Record<string, unknown>
    >({
      connectorOperation: {
        tableName: CONNECTOR_DATA_SOURCE,
        operationName: 'GetItemWithOrganization',
        parameters: {
          organization: DATAVERSE_ORG_URL,
          prefer: 'return=representation',
          accept: 'application/json',
          entityName: this.adapter.tableName,
          recordId: id,
          $select: this.selectColumns().join(','),
        },
      },
    })

    if (!result.success) {
      const status = (result.error as { status?: number } | undefined)?.status
      if (status === 404) {
        throw new NotFoundError(this.adapter.tableName, id)
      }
      this.throwOnFailure(result, 'GetItemWithOrganization')
    }

    return this.fromDataverse(result.data)
  }

  private async createInternal(item: Partial<T>): Promise<T> {
    const dvRecord = this.toDataverse(item)

    const result = await this.client.executeAsync<
      Record<string, unknown>,
      Record<string, unknown>
    >({
      connectorOperation: {
        tableName: CONNECTOR_DATA_SOURCE,
        operationName: 'CreateRecordWithOrganization',
        parameters: {
          organization: DATAVERSE_ORG_URL,
          prefer: 'return=representation',
          accept: 'application/json',
          entityName: this.adapter.tableName,
          item: dvRecord,
        },
      },
    })

    this.throwOnFailure(result, 'CreateRecordWithOrganization')

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

    const result = await this.client.executeAsync<
      Record<string, unknown>,
      Record<string, unknown>
    >({
      connectorOperation: {
        tableName: CONNECTOR_DATA_SOURCE,
        operationName: 'UpdateRecordWithOrganization',
        parameters: {
          organization: DATAVERSE_ORG_URL,
          prefer: 'return=representation',
          accept: 'application/json',
          entityName: this.adapter.tableName,
          recordId: id,
          item: dvRecord,
        },
      },
    })

    this.throwOnFailure(result, 'UpdateRecordWithOrganization')

    return this.getByIdInternal(id)
  }

  private async deleteInternal(id: string): Promise<void> {
    const result = await this.client.executeAsync<
      Record<string, unknown>,
      void
    >({
      connectorOperation: {
        tableName: CONNECTOR_DATA_SOURCE,
        operationName: 'DeleteRecordWithOrganization',
        parameters: {
          organization: DATAVERSE_ORG_URL,
          entityName: this.adapter.tableName,
          recordId: id,
        },
      },
    })

    if (!result.success) {
      const status = (result.error as { status?: number } | undefined)?.status
      if (status === 404) {
        throw new NotFoundError(this.adapter.tableName, id)
      }
      this.throwOnFailure(result, 'DeleteRecordWithOrganization')
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Returns the Dataverse column names that actually exist on the entity (excludes virtual). */
  private selectColumns(): string[] {
    return Object.entries(this.adapter.columns)
      .filter(([tsKey]) => !this.adapter.virtualColumns?.has(tsKey as keyof T & string))
      .map(([, dvCol]) => dvCol)
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

      // Skip virtual columns (they don't exist on the Dataverse entity)
      if (this.adapter.virtualColumns?.has(tsKey as keyof T & string)) continue

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

  // ── Query building (for ListRecords connector params) ──────────────────

  private buildListParams(options?: ListOptions): Record<string, unknown> {
    const params: Record<string, unknown> = {
      organization: DATAVERSE_ORG_URL,
      entityName: this.adapter.tableName,
    }

    // Select only real (non-virtual) columns
    params.$select = this.selectColumns().join(',')

    // Pagination
    if (options?.top) params.$top = options.top

    // Sorting
    if (options?.orderBy) {
      const parts = options.orderBy.split(' ')
      const tsField = parts[0]
      const direction = parts[1] ?? 'asc'
      const dvCol = this.adapter.columns[tsField as keyof T & string] ?? tsField
      params.$orderby = `${dvCol} ${direction}`
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
      const translated = this.translateFilter(options.filter)
      filters.push(translated)
    }

    if (filters.length > 0) {
      params.$filter = filters.join(' and ')
    }

    return params
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
