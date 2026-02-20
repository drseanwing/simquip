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

// ── Module 1: Issue / Corrective Action ─────────────────────────────────────

export const IssueStatus = {
  Open: 'Open',
  InProgress: 'InProgress',
  AwaitingParts: 'AwaitingParts',
  Resolved: 'Resolved',
  Closed: 'Closed',
} as const
export type IssueStatus = (typeof IssueStatus)[keyof typeof IssueStatus]

export const IssuePriority = {
  Low: 'Low',
  Medium: 'Medium',
  High: 'High',
  Critical: 'Critical',
} as const
export type IssuePriority = (typeof IssuePriority)[keyof typeof IssuePriority]

export const CorrectiveActionStatus = {
  Planned: 'Planned',
  InProgress: 'InProgress',
  Completed: 'Completed',
  Verified: 'Verified',
} as const
export type CorrectiveActionStatus =
  (typeof CorrectiveActionStatus)[keyof typeof CorrectiveActionStatus]

// ── Module 2: Preventative Maintenance ──────────────────────────────────────

export const PMStatus = {
  Scheduled: 'Scheduled',
  InProgress: 'InProgress',
  Completed: 'Completed',
  Overdue: 'Overdue',
  Cancelled: 'Cancelled',
} as const
export type PMStatus = (typeof PMStatus)[keyof typeof PMStatus]

export const PMFrequency = {
  Weekly: 'Weekly',
  Monthly: 'Monthly',
  Quarterly: 'Quarterly',
  SemiAnnual: 'SemiAnnual',
  Annual: 'Annual',
} as const
export type PMFrequency = (typeof PMFrequency)[keyof typeof PMFrequency]

export const PMChecklistItemStatus = {
  Pending: 'Pending',
  Pass: 'Pass',
  Fail: 'Fail',
  NotApplicable: 'NotApplicable',
} as const
export type PMChecklistItemStatus =
  (typeof PMChecklistItemStatus)[keyof typeof PMChecklistItemStatus]
