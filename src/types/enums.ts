export const EquipmentStatus = {
  Available: 'Available',
  InUse: 'InUse',
  UnderMaintenance: 'UnderMaintenance',
  Retired: 'Retired',
} as const
export type EquipmentStatus = (typeof EquipmentStatus)[keyof typeof EquipmentStatus]

export const LoanStatus = {
  Draft: 'Draft',
  Active: 'Active',
  Overdue: 'Overdue',
  Returned: 'Returned',
  Cancelled: 'Cancelled',
} as const
export type LoanStatus = (typeof LoanStatus)[keyof typeof LoanStatus]

export const LoanReason = {
  Simulation: 'Simulation',
  Training: 'Training',
  Service: 'Service',
  Other: 'Other',
} as const
export type LoanReason = (typeof LoanReason)[keyof typeof LoanReason]

export const OwnerType = {
  Team: 'Team',
  Person: 'Person',
} as const
export type OwnerType = (typeof OwnerType)[keyof typeof OwnerType]

export const MediaType = {
  Image: 'Image',
  Attachment: 'Attachment',
} as const
export type MediaType = (typeof MediaType)[keyof typeof MediaType]
