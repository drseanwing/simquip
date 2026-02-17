import type { EquipmentStatus, LoanReason, LoanStatus, MediaType, OwnerType } from './enums'

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
