import type {
  Building,
  CorrectiveAction,
  Equipment,
  EquipmentMedia,
  EquipmentIssue,
  IssueNote,
  Level,
  LoanTransfer,
  Location,
  LocationMedia,
  Person,
  PMTask,
  PMTaskItem,
  PMTemplate,
  PMTemplateItem,
  Team,
  TeamMember,
} from '../types'
import type { DataService } from './dataService'
import { getDataClient } from './dataverseClient'
import { DataverseDataService } from './dataverseDataService'
import {
  buildingAdapter,
  correctiveActionAdapter,
  equipmentAdapter,
  equipmentIssueAdapter,
  equipmentMediaAdapter,
  issueNoteAdapter,
  levelAdapter,
  loanTransferAdapter,
  locationAdapter,
  locationMediaAdapter,
  personAdapter,
  pmTaskAdapter,
  pmTaskItemAdapter,
  pmTemplateAdapter,
  pmTemplateItemAdapter,
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
  // Module 1: Issue / Corrective Action
  equipmentIssueService: DataService<EquipmentIssue>
  issueNoteService: DataService<IssueNote>
  correctiveActionService: DataService<CorrectiveAction>
  // Module 2: Preventative Maintenance
  pmTemplateService: DataService<PMTemplate>
  pmTemplateItemService: DataService<PMTemplateItem>
  pmTaskService: DataService<PMTask>
  pmTaskItemService: DataService<PMTaskItem>
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
    // Module 1: Issue / Corrective Action
    equipmentIssueService: new DataverseDataService(client, equipmentIssueAdapter),
    issueNoteService: new DataverseDataService(client, issueNoteAdapter),
    correctiveActionService: new DataverseDataService(client, correctiveActionAdapter),
    // Module 2: Preventative Maintenance
    pmTemplateService: new DataverseDataService(client, pmTemplateAdapter),
    pmTemplateItemService: new DataverseDataService(client, pmTemplateItemAdapter),
    pmTaskService: new DataverseDataService(client, pmTaskAdapter),
    pmTaskItemService: new DataverseDataService(client, pmTaskItemAdapter),
  }

  instance = registry
  return registry
}
