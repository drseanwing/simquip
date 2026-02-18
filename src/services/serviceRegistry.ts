import type {
  Building,
  Equipment,
  EquipmentMedia,
  Level,
  LoanTransfer,
  Location,
  LocationMedia,
  Person,
  Team,
  TeamMember,
} from '../types'
import type { DataService } from './dataService'
import { getDataClient } from './dataverseClient'
import { DataverseDataService } from './dataverseDataService'
import {
  buildingAdapter,
  equipmentAdapter,
  equipmentMediaAdapter,
  levelAdapter,
  loanTransferAdapter,
  locationAdapter,
  locationMediaAdapter,
  personAdapter,
  teamAdapter,
  teamMemberAdapter,
} from './dataverseAdapters'

export interface ServiceRegistry {
  personService: DataService<Person>
  teamService: DataService<Team>
  teamMemberService: DataService<TeamMember>
  buildingService: DataService<Building>
  levelService: DataService<Level>
  locationService: DataService<Location>
  equipmentService: DataService<Equipment>
  equipmentMediaService: DataService<EquipmentMedia>
  locationMediaService: DataService<LocationMedia>
  loanTransferService: DataService<LoanTransfer>
}

let instance: ServiceRegistry | null = null

export function getServiceRegistry(): ServiceRegistry {
  if (instance) return instance

  const client = getDataClient()

  const registry: ServiceRegistry = {
    personService: new DataverseDataService(client, personAdapter),
    teamService: new DataverseDataService(client, teamAdapter),
    teamMemberService: new DataverseDataService(client, teamMemberAdapter),
    buildingService: new DataverseDataService(client, buildingAdapter),
    levelService: new DataverseDataService(client, levelAdapter),
    locationService: new DataverseDataService(client, locationAdapter),
    equipmentService: new DataverseDataService(client, equipmentAdapter),
    equipmentMediaService: new DataverseDataService(client, equipmentMediaAdapter),
    locationMediaService: new DataverseDataService(client, locationMediaAdapter),
    loanTransferService: new DataverseDataService(client, loanTransferAdapter),
  }

  instance = registry
  return registry
}
