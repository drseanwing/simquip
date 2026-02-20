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
} from './enums'

export interface Person {
  personId: string
  displayName: string
  email: string
  phone: string
  teamId: string | null
  active: boolean
}

export interface Team {
  teamId: string
  teamCode: string
  name: string
  mainContactPersonId: string
  mainLocationId: string
  active: boolean
}

export interface TeamMember {
  teamMemberId: string
  teamId: string
  personId: string
  role: string
}

export interface Building {
  buildingId: string
  name: string
  code: string
}

export interface Level {
  levelId: string
  buildingId: string
  name: string
  sortOrder: number
}

export interface Location {
  locationId: string
  buildingId: string
  levelId: string
  name: string
  contactPersonId: string
  description: string
}

export interface Equipment {
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
}

export interface EquipmentMedia {
  equipmentMediaId: string
  equipmentId: string
  mediaType: MediaType
  fileName: string
  mimeType: string
  fileUrl: string
  sortOrder: number
}

export interface LocationMedia {
  locationMediaId: string
  locationId: string
  mediaType: MediaType
  fileName: string
  mimeType: string
  fileUrl: string
  sortOrder: number
}

export interface LoanTransfer {
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
}

// ── Module 1: Issue / Corrective Action ─────────────────────────────────────

export interface EquipmentIssue {
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
}

export interface IssueNote {
  issueNoteId: string
  issueId: string
  authorPersonId: string
  content: string
  createdOn: string
}

export interface CorrectiveAction {
  correctiveActionId: string
  issueId: string
  description: string
  assignedToPersonId: string
  status: CorrectiveActionStatus
  equipmentStatusChange: EquipmentStatus | null
  completedOn: string | null
  createdOn: string
}

// ── Module 2: Preventative Maintenance ──────────────────────────────────────

export interface PMTemplate {
  pmTemplateId: string
  equipmentId: string
  name: string
  description: string
  frequency: PMFrequency
  active: boolean
}

export interface PMTemplateItem {
  pmTemplateItemId: string
  pmTemplateId: string
  description: string
  sortOrder: number
}

export interface PMTask {
  pmTaskId: string
  pmTemplateId: string
  equipmentId: string
  scheduledDate: string
  completedDate: string | null
  completedByPersonId: string | null
  status: PMStatus
  notes: string
  generatedIssueId: string | null
}

export interface PMTaskItem {
  pmTaskItemId: string
  pmTaskId: string
  pmTemplateItemId: string
  description: string
  status: PMChecklistItemStatus
  notes: string
  sortOrder: number
}
