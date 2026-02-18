import { getClient } from '@microsoft/power-apps/data'
import type { DataClient } from '@microsoft/power-apps/data'

let clientInstance: DataClient | null = null

/**
 * Returns the shared DataClient instance.
 * Must be called after the Power Apps SDK has been initialised.
 */
export function getDataClient(): DataClient {
  if (!clientInstance) {
    // getClient() reads data-source registrations that pac code add-data-source wrote
    // into power.config.json (databaseReferences). The runtime host injects the
    // concrete connection details at launch.
    clientInstance = getClient({})
  }
  return clientInstance
}
