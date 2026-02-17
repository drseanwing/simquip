export type { DataService, ListOptions, PagedResult } from './dataService'

export { MockDataService } from './mockDataService'
export type { MockDataServiceConfig } from './mockDataService'

export {
  mockTeams,
  mockPersons,
  mockBuildings,
  mockLevels,
  mockLocations,
  mockEquipment,
  mockLoanTransfers,
} from './mockData'

export { EquipmentService } from './equipmentService'
export type { EquipmentWithDetails } from './equipmentService'

export {
  validateEquipment,
  validateLoanTransfer,
  validateTeam,
  validateLocation,
  validatePerson,
} from './validators'
