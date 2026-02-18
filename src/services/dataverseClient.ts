import { getClient } from '@microsoft/power-apps/data'
import type { DataClient } from '@microsoft/power-apps/data'
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
import { dataSourcesInfo } from '../../.power/schemas/appschemas/dataSourcesInfo'

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
