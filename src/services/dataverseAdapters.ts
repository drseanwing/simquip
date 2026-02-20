/**
 * Column-mapping configurations for each Dataverse table.
 *
 * Each adapter describes how to translate between a TypeScript model's camelCase
 * property names and the Dataverse redi_ column logical names, plus how to
 * convert choice integers ↔ string enum values.
 */

import type {
  CorrectiveActionStatus,
  EquipmentStatus,
  IssuePriority,
  IssueStatus,
  LoanReason,
  LoanStatus,
  MediaType,
  OwnerType,
  PMChecklistItemStatus,
  PMFrequency,
  PMStatus,
} from '../types/enums'

// ── Choice maps ──────────────────────────────────────────────────────────────

const ownerTypeMap: Record<string, number> = { Team: 1, Person: 2 }
const equipmentStatusMap: Record<string, number> = {
  Available: 1,
  InUse: 2,
  UnderMaintenance: 3,
  Retired: 4,
}
const loanStatusMap: Record<string, number> = {
  Draft: 100000000,
  Active: 100000001,
  Overdue: 100000002,
  Returned: 100000003,
  Cancelled: 100000004,
}
const loanReasonMap: Record<string, number> = {
  Simulation: 100000000,
  Training: 100000001,
  Service: 100000002,
  Other: 100000003,
}
const mediaTypeMap: Record<string, number> = { Image: 100000000, Attachment: 100000001 }

// Module 1: Issue / Corrective Action choice maps
const issueStatusMap: Record<string, number> = {
  Open: 100000000,
  InProgress: 100000001,
  AwaitingParts: 100000002,
  Resolved: 100000003,
  Closed: 100000004,
}
const issuePriorityMap: Record<string, number> = {
  Low: 100000000,
  Medium: 100000001,
  High: 100000002,
  Critical: 100000003,
}
const correctiveActionStatusMap: Record<string, number> = {
  Planned: 100000000,
  InProgress: 100000001,
  Completed: 100000002,
  Verified: 100000003,
}

// Module 2: Preventative Maintenance choice maps
const pmStatusMap: Record<string, number> = {
  Scheduled: 100000000,
  InProgress: 100000001,
  Completed: 100000002,
  Overdue: 100000003,
  Cancelled: 100000004,
}
const pmFrequencyMap: Record<string, number> = {
  Weekly: 100000000,
  Monthly: 100000001,
  Quarterly: 100000002,
  SemiAnnual: 100000003,
  Annual: 100000004,
}
const pmChecklistItemStatusMap: Record<string, number> = {
  Pending: 100000000,
  Pass: 100000001,
  Fail: 100000002,
  NotApplicable: 100000003,
}

function invertMap(map: Record<string, number>): Record<number, string> {
  const inv: Record<number, string> = {}
  for (const [k, v] of Object.entries(map)) inv[v] = k
  return inv
}

// ── Adapter type ─────────────────────────────────────────────────────────────

export interface ColumnAdapter<T> {
  /** Data source name as registered in power.config.json (entitySetName, e.g. 'redi_equipments') */
  tableName: string
  /** TypeScript ID property name (e.g. 'equipmentId') */
  idField: keyof T & string
  /** Dataverse primary-key column logical name (e.g. 'redi_equipmentid') */
  idColumn: string
  /** Map: TS property → Dataverse column logical name */
  columns: Record<keyof T & string, string>
  /** Choice columns: TS property → { toDb, fromDb } mappers */
  choices?: Partial<
    Record<
      keyof T & string,
      { toDb: (v: string) => number; fromDb: (v: number) => string }
    >
  >
  /** Lookup columns that reference other tables (for $expand / formatted values) */
  lookups?: Partial<
    Record<keyof T & string, { navigationProperty: string; targetIdColumn: string }>
  >
  /** Columns that exist in the TS model but NOT on the Dataverse entity.
   *  Excluded from $select; always return null from reads; skipped on writes. */
  virtualColumns?: Set<keyof T & string>
  /** OData $filter always applied on list queries (e.g., app-isolation filter for shared tables) */
  defaultFilter?: string
  /** For lookup columns (_xxx_value): maps TS key → target entity set name (e.g. 'redi_buildings')
   *  Used to build @odata.bind references when writing lookup values. */
  lookupTargets?: Partial<Record<keyof T & string, string>>
  /** Fields to search when ListOptions.search is provided */
  searchFields: (keyof T & string)[]
}

function choiceMapper(
  toDbMap: Record<string, number>,
): { toDb: (v: string) => number; fromDb: (v: number) => string } {
  const fromDbMap = invertMap(toDbMap)
  return {
    toDb: (v: string) => toDbMap[v] ?? 0,
    fromDb: (v: number) => fromDbMap[v] ?? '',
  }
}

// ── Per-entity adapters ──────────────────────────────────────────────────────

export const personAdapter: ColumnAdapter<{
  personId: string
  displayName: string
  email: string
  phone: string
  teamId: string | null
  active: boolean
}> = {
  tableName: 'redi_persons',
  idField: 'personId',
  idColumn: 'redi_personid',
  columns: {
    personId: 'redi_personid',
    displayName: 'redi_displayname',
    email: 'redi_email',
    phone: 'redi_phone',
    // No direct teamId column on redi_person; team membership is via redi_teammember.
    // Mapped here for type compatibility; returns null from Dataverse.
    teamId: '_redi_teamid_value',
    active: 'redi_active',
  },
  virtualColumns: new Set(['teamId']),
  defaultFilter: 'redi_active ne null',
  searchFields: ['displayName', 'email'],
}

export const teamAdapter: ColumnAdapter<{
  teamId: string
  teamCode: string
  name: string
  mainContactPersonId: string
  mainLocationId: string
  active: boolean
}> = {
  tableName: 'redi_teams',
  idField: 'teamId',
  idColumn: 'redi_teamid',
  columns: {
    teamId: 'redi_teamid',
    teamCode: 'redi_teamcode',
    name: 'redi_team_name',
    mainContactPersonId: '_redi_maincontactpersonid_value',
    mainLocationId: '_redi_mainlocationid_value',
    active: 'redi_active',
  },
  lookupTargets: {
    mainContactPersonId: 'redi_persons',
    mainLocationId: 'redi_locations',
  },
  searchFields: ['name', 'teamCode'],
}

export const teamMemberAdapter: ColumnAdapter<{
  teamMemberId: string
  teamId: string
  personId: string
  role: string
}> = {
  tableName: 'redi_teammembers',
  idField: 'teamMemberId',
  idColumn: 'redi_teammemberid',
  columns: {
    teamMemberId: 'redi_teammemberid',
    teamId: '_redi_teamid_value',
    personId: '_redi_personid_value',
    role: 'redi_role',
  },
  lookupTargets: {
    teamId: 'redi_teams',
    personId: 'redi_persons',
  },
  searchFields: ['role'],
}

export const buildingAdapter: ColumnAdapter<{
  buildingId: string
  name: string
  code: string
}> = {
  tableName: 'redi_buildings',
  idField: 'buildingId',
  idColumn: 'redi_buildingid',
  columns: {
    buildingId: 'redi_buildingid',
    name: 'redi_building_name',
    code: 'redi_code',
  },
  searchFields: ['name', 'code'],
}

export const levelAdapter: ColumnAdapter<{
  levelId: string
  buildingId: string
  name: string
  sortOrder: number
}> = {
  tableName: 'redi_levels',
  idField: 'levelId',
  idColumn: 'redi_levelid',
  columns: {
    levelId: 'redi_levelid',
    buildingId: '_redi_buildingid_value',
    name: 'redi_level_name',
    sortOrder: 'redi_sortorder',
  },
  lookupTargets: { buildingId: 'redi_buildings' },
  searchFields: ['name'],
}

export const locationAdapter: ColumnAdapter<{
  locationId: string
  buildingId: string
  levelId: string
  name: string
  contactPersonId: string
  description: string
}> = {
  tableName: 'redi_locations',
  idField: 'locationId',
  idColumn: 'redi_locationid',
  columns: {
    locationId: 'redi_locationid',
    buildingId: '_redi_sq_buildingid_value',
    levelId: '_redi_sq_levelid_value',
    name: 'redi_departmentname',
    contactPersonId: '_redi_contactpersonid_value',
    description: 'redi_sq_description',
  },
  defaultFilter: '_redi_sq_buildingid_value ne null',
  lookupTargets: {
    buildingId: 'redi_buildings',
    levelId: 'redi_levels',
    contactPersonId: 'redi_persons',
  },
  searchFields: ['name', 'description'],
}

export const equipmentAdapter: ColumnAdapter<{
  equipmentId: string
  equipmentCode: string
  name: string
  description: string
  ownerType: OwnerType
  ownerTeamId: string | null
  ownerPersonId: string | null
  contactPersonId: string
  homeLocationId: string
  parentEquipmentId: string | null
  keyImageUrl: string
  quickStartFlowChartJson: string
  contentsListJson: string
  status: EquipmentStatus
  active: boolean
}> = {
  tableName: 'redi_equipments',
  idField: 'equipmentId',
  idColumn: 'redi_equipmentid',
  columns: {
    equipmentId: 'redi_equipmentid',
    equipmentCode: 'redi_equipmentcode',
    name: 'redi_itemname',
    description: 'redi_sq_description',
    ownerType: 'redi_sq_ownertype',
    ownerTeamId: '_redi_ownerteamid_value',
    ownerPersonId: '_redi_ownerpersonid_value',
    contactPersonId: '_redi_sq_contactpersonid_value',
    homeLocationId: '_redi_sq_homelocationid_value',
    parentEquipmentId: '_redi_parentequipmentid_value',
    keyImageUrl: 'redi_keyimageurl',
    quickStartFlowChartJson: 'redi_quickstartflowchartjson',
    contentsListJson: 'redi_contentslistjson',
    status: 'redi_sq_status',
    active: 'redi_sq_active',
  },
  choices: {
    ownerType: choiceMapper(ownerTypeMap),
    status: choiceMapper(equipmentStatusMap),
  },
  defaultFilter: 'redi_sq_active ne null',
  lookupTargets: {
    ownerTeamId: 'redi_teams',
    ownerPersonId: 'redi_persons',
    contactPersonId: 'redi_persons',
    homeLocationId: 'redi_locations',
    parentEquipmentId: 'redi_equipments',
  },
  searchFields: ['name', 'equipmentCode', 'description'],
}

export const equipmentMediaAdapter: ColumnAdapter<{
  equipmentMediaId: string
  equipmentId: string
  mediaType: MediaType
  fileName: string
  mimeType: string
  fileUrl: string
  sortOrder: number
}> = {
  tableName: 'redi_equipmentmedias',
  idField: 'equipmentMediaId',
  idColumn: 'redi_equipmentmediaid',
  columns: {
    equipmentMediaId: 'redi_equipmentmediaid',
    equipmentId: '_redi_equipmentid_value',
    mediaType: 'redi_mediatype',
    fileName: 'redi_filename',
    mimeType: 'redi_mimetype',
    fileUrl: 'redi_fileurl',
    sortOrder: 'redi_sortorder',
  },
  choices: {
    mediaType: choiceMapper(mediaTypeMap),
  },
  lookupTargets: { equipmentId: 'redi_equipments' },
  searchFields: ['fileName'],
}

export const locationMediaAdapter: ColumnAdapter<{
  locationMediaId: string
  locationId: string
  mediaType: MediaType
  fileName: string
  mimeType: string
  fileUrl: string
  sortOrder: number
}> = {
  tableName: 'redi_locationmedias',
  idField: 'locationMediaId',
  idColumn: 'redi_locationmediaid',
  columns: {
    locationMediaId: 'redi_locationmediaid',
    locationId: '_redi_locationid_value',
    mediaType: 'redi_mediatype',
    fileName: 'redi_filename',
    mimeType: 'redi_mimetype',
    fileUrl: 'redi_fileurl',
    sortOrder: 'redi_sortorder',
  },
  choices: {
    mediaType: choiceMapper(mediaTypeMap),
  },
  lookupTargets: { locationId: 'redi_locations' },
  searchFields: ['fileName'],
}

export const loanTransferAdapter: ColumnAdapter<{
  loanTransferId: string
  equipmentId: string
  startDate: string
  dueDate: string
  originTeamId: string
  recipientTeamId: string
  reasonCode: LoanReason
  approverPersonId: string
  isInternalTransfer: boolean
  status: LoanStatus
  notes: string
}> = {
  tableName: 'redi_loantransfers',
  idField: 'loanTransferId',
  idColumn: 'redi_loantransferid',
  columns: {
    loanTransferId: 'redi_loantransferid',
    equipmentId: '_redi_equipmentid_value',
    startDate: 'redi_startdate',
    dueDate: 'redi_duedate',
    originTeamId: '_redi_originteamid_value',
    recipientTeamId: '_redi_recipientteamid_value',
    reasonCode: 'redi_reasoncode',
    approverPersonId: '_redi_approverpersonid_value',
    isInternalTransfer: 'redi_isinternaltransfer',
    status: 'redi_loanstatus',
    notes: 'redi_notes',
  },
  choices: {
    reasonCode: choiceMapper(loanReasonMap),
    status: choiceMapper(loanStatusMap),
  },
  lookupTargets: {
    equipmentId: 'redi_equipments',
    originTeamId: 'redi_teams',
    recipientTeamId: 'redi_teams',
    approverPersonId: 'redi_persons',
  },
  searchFields: ['notes'],
}

// ── Module 1: Issue / Corrective Action adapters ─────────────────────────────

export const equipmentIssueAdapter: ColumnAdapter<{
  issueId: string
  equipmentId: string
  title: string
  description: string
  reportedByPersonId: string
  assignedToPersonId: string | null
  status: IssueStatus
  priority: IssuePriority
  dueDate: string
  createdOn: string
  resolvedOn: string | null
  active: boolean
}> = {
  tableName: 'redi_equipmentissues',
  idField: 'issueId',
  idColumn: 'redi_equipmentissueid',
  columns: {
    issueId: 'redi_equipmentissueid',
    equipmentId: '_redi_equipmentid_value',
    title: 'redi_title',
    description: 'redi_description',
    reportedByPersonId: '_redi_reportedbypersonid_value',
    assignedToPersonId: '_redi_assignedtopersonid_value',
    status: 'redi_issuestatus',
    priority: 'redi_issuepriority',
    dueDate: 'redi_duedate',
    createdOn: 'redi_createdon',
    resolvedOn: 'redi_resolvedon',
    active: 'redi_active',
  },
  choices: {
    status: choiceMapper(issueStatusMap),
    priority: choiceMapper(issuePriorityMap),
  },
  lookupTargets: {
    equipmentId: 'redi_equipments',
    reportedByPersonId: 'redi_persons',
    assignedToPersonId: 'redi_persons',
  },
  searchFields: ['title', 'description'],
}

export const issueNoteAdapter: ColumnAdapter<{
  issueNoteId: string
  issueId: string
  authorPersonId: string
  content: string
  createdOn: string
}> = {
  tableName: 'redi_issuenotes',
  idField: 'issueNoteId',
  idColumn: 'redi_issuenoteid',
  columns: {
    issueNoteId: 'redi_issuenoteid',
    issueId: '_redi_equipmentissueid_value',
    authorPersonId: '_redi_authorpersonid_value',
    content: 'redi_content',
    createdOn: 'redi_createdon',
  },
  lookupTargets: {
    issueId: 'redi_equipmentissues',
    authorPersonId: 'redi_persons',
  },
  searchFields: ['content'],
}

export const correctiveActionAdapter: ColumnAdapter<{
  correctiveActionId: string
  issueId: string
  description: string
  assignedToPersonId: string
  status: CorrectiveActionStatus
  equipmentStatusChange: EquipmentStatus | null
  completedOn: string | null
  createdOn: string
}> = {
  tableName: 'redi_correctiveactions',
  idField: 'correctiveActionId',
  idColumn: 'redi_correctiveactionid',
  columns: {
    correctiveActionId: 'redi_correctiveactionid',
    issueId: '_redi_equipmentissueid_value',
    description: 'redi_description',
    assignedToPersonId: '_redi_assignedtopersonid_value',
    status: 'redi_actionstatus',
    equipmentStatusChange: 'redi_equipmentstatuschange',
    completedOn: 'redi_completedon',
    createdOn: 'redi_createdon',
  },
  choices: {
    status: choiceMapper(correctiveActionStatusMap),
    equipmentStatusChange: choiceMapper(equipmentStatusMap),
  },
  lookupTargets: {
    issueId: 'redi_equipmentissues',
    assignedToPersonId: 'redi_persons',
  },
  searchFields: ['description'],
}

// ── Module 2: Preventative Maintenance adapters ──────────────────────────────

export const pmTemplateAdapter: ColumnAdapter<{
  pmTemplateId: string
  equipmentId: string
  name: string
  description: string
  frequency: PMFrequency
  active: boolean
}> = {
  tableName: 'redi_pmtemplates',
  idField: 'pmTemplateId',
  idColumn: 'redi_pmtemplateid',
  columns: {
    pmTemplateId: 'redi_pmtemplateid',
    equipmentId: '_redi_equipmentid_value',
    name: 'redi_name',
    description: 'redi_description',
    frequency: 'redi_frequency',
    active: 'redi_active',
  },
  choices: {
    frequency: choiceMapper(pmFrequencyMap),
  },
  lookupTargets: {
    equipmentId: 'redi_equipments',
  },
  searchFields: ['name', 'description'],
}

export const pmTemplateItemAdapter: ColumnAdapter<{
  pmTemplateItemId: string
  pmTemplateId: string
  description: string
  sortOrder: number
}> = {
  tableName: 'redi_pmtemplateitems',
  idField: 'pmTemplateItemId',
  idColumn: 'redi_pmtemplateitemid',
  columns: {
    pmTemplateItemId: 'redi_pmtemplateitemid',
    pmTemplateId: '_redi_pmtemplateid_value',
    description: 'redi_description',
    sortOrder: 'redi_sortorder',
  },
  lookupTargets: {
    pmTemplateId: 'redi_pmtemplates',
  },
  searchFields: ['description'],
}

export const pmTaskAdapter: ColumnAdapter<{
  pmTaskId: string
  pmTemplateId: string
  equipmentId: string
  scheduledDate: string
  completedDate: string | null
  completedByPersonId: string | null
  status: PMStatus
  notes: string
  generatedIssueId: string | null
}> = {
  tableName: 'redi_pmtasks',
  idField: 'pmTaskId',
  idColumn: 'redi_pmtaskid',
  columns: {
    pmTaskId: 'redi_pmtaskid',
    pmTemplateId: '_redi_pmtemplateid_value',
    equipmentId: '_redi_equipmentid_value',
    scheduledDate: 'redi_scheduleddate',
    completedDate: 'redi_completeddate',
    completedByPersonId: '_redi_completedbypersonid_value',
    status: 'redi_pmstatus',
    notes: 'redi_notes',
    generatedIssueId: '_redi_generatedissueid_value',
  },
  choices: {
    status: choiceMapper(pmStatusMap),
  },
  lookupTargets: {
    pmTemplateId: 'redi_pmtemplates',
    equipmentId: 'redi_equipments',
    completedByPersonId: 'redi_persons',
    generatedIssueId: 'redi_equipmentissues',
  },
  searchFields: ['notes'],
}

export const pmTaskItemAdapter: ColumnAdapter<{
  pmTaskItemId: string
  pmTaskId: string
  pmTemplateItemId: string
  description: string
  status: PMChecklistItemStatus
  notes: string
  sortOrder: number
}> = {
  tableName: 'redi_pmtaskitems',
  idField: 'pmTaskItemId',
  idColumn: 'redi_pmtaskitemid',
  columns: {
    pmTaskItemId: 'redi_pmtaskitemid',
    pmTaskId: '_redi_pmtaskid_value',
    pmTemplateItemId: '_redi_pmtemplateitemid_value',
    description: 'redi_description',
    status: 'redi_checkliststatus',
    notes: 'redi_notes',
    sortOrder: 'redi_sortorder',
  },
  choices: {
    status: choiceMapper(pmChecklistItemStatusMap),
  },
  lookupTargets: {
    pmTaskId: 'redi_pmtasks',
    pmTemplateItemId: 'redi_pmtemplateitems',
  },
  searchFields: ['description', 'notes'],
}
