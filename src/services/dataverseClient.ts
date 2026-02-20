import { getClient } from '@microsoft/power-apps/data'
import type { DataClient } from '@microsoft/power-apps/data'

type DataSourcesInfo = Parameters<typeof getClient>[0]

const dataSourcesInfo = (
  (globalThis as Record<string, unknown>).__DATA_SOURCES_INFO__ ?? {}
) as DataSourcesInfo

let clientInstance: DataClient | null = null

/**
 * Returns the shared DataClient instance.
 * Must be called after the Power Apps SDK has been initialised.
 * Passes the PAC-generated dataSourcesInfo so the SDK can resolve
 * data source names to their connection configurations.
 */
export function getDataClient(): DataClient {
  if (!clientInstance) {
    clientInstance = getClient(dataSourcesInfo)
  }
  return clientInstance
}
