import { describe, it, expect } from 'vitest'
import {
  validateEquipment,
  validateLoanTransfer,
  validateTeam,
  validateLocation,
  validatePerson,
  validateEquipmentIssue,
  validateIssueNote,
  validateCorrectiveAction,
  validatePMTemplate,
  validatePMTask,
} from './validators.ts'
import { ValidationError } from '../errors/index.ts'
import {
  OwnerType,
  EquipmentStatus,
  LoanStatus,
  LoanReason,
  IssueStatus,
  IssuePriority,
  CorrectiveActionStatus,
  PMFrequency,
  PMStatus,
} from '../types/index.ts'
import type {
  Equipment,
  LoanTransfer,
  Team,
  Location,
  Person,
  EquipmentIssue,
  IssueNote,
  CorrectiveAction,
  PMTemplate,
  PMTask,
} from '../types/index.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validEquipment(): Equipment {
  return {
    equipmentId: 'eq-1',
    equipmentCode: 'EQ-001',
    name: 'Defibrillator',
    description: 'Portable AED unit',
    ownerType: OwnerType.Team,
    ownerTeamId: 'team-1',
    ownerPersonId: null,
    contactPersonId: 'person-1',
    homeLocationId: 'loc-1',
    parentEquipmentId: null,
    keyImageUrl: '',
    quickStartFlowChartJson: '{}',
    contentsListJson: '[]',
    status: EquipmentStatus.Available,
    active: true,
  }
}

function validLoanTransfer(): LoanTransfer {
  return {
    loanTransferId: 'loan-1',
    equipmentId: 'eq-1',
    startDate: '2026-01-01',
    dueDate: '2026-01-15',
    originTeamId: 'team-1',
    recipientTeamId: 'team-2',
    reasonCode: LoanReason.Simulation,
    approverPersonId: 'person-2',
    isInternalTransfer: false,
    status: LoanStatus.Draft,
    notes: '',
  }
}

function validTeam(): Team {
  return {
    teamId: 'team-1',
    teamCode: 'SIM-01',
    name: 'Simulation Team',
    mainContactPersonId: 'person-1',
    mainLocationId: 'loc-1',
    active: true,
  }
}

function validLocation(): Location {
  return {
    locationId: 'loc-1',
    buildingId: 'bld-1',
    levelId: 'lvl-1',
    name: 'Room 101',
    contactPersonId: 'person-1',
    description: 'Main simulation room',
  }
}

function validPerson(): Person {
  return {
    personId: 'person-1',
    displayName: 'Jane Doe',
    email: 'jane.doe@rbwh.edu.au',
    phone: '0412345678',
    teamId: 'team-1',
    active: true,
  }
}

function validEquipmentIssue(): EquipmentIssue {
  return {
    issueId: 'issue-1',
    equipmentId: 'eq-1',
    title: 'Damaged connector',
    description: 'The power connector is cracked',
    reportedByPersonId: 'person-1',
    assignedToPersonId: 'person-2',
    status: IssueStatus.Open,
    priority: IssuePriority.Medium,
    dueDate: '2026-02-27',
    createdOn: '2026-02-20',
    resolvedOn: null,
    active: true,
  }
}

function validIssueNote(): IssueNote {
  return {
    issueNoteId: 'note-1',
    issueId: 'issue-1',
    authorPersonId: 'person-1',
    content: 'Inspection scheduled for tomorrow',
    createdOn: '2026-02-20T10:00:00Z',
  }
}

function validCorrectiveAction(): CorrectiveAction {
  return {
    correctiveActionId: 'ca-1',
    issueId: 'issue-1',
    description: 'Replace damaged connector',
    assignedToPersonId: 'person-2',
    status: CorrectiveActionStatus.Planned,
    equipmentStatusChange: null,
    completedOn: null,
    createdOn: '2026-02-20T10:00:00Z',
  }
}

function validPMTemplate(): PMTemplate {
  return {
    pmTemplateId: 'pmt-1',
    equipmentId: 'eq-1',
    name: 'Monthly Inspection',
    description: 'Standard monthly equipment check',
    frequency: PMFrequency.Monthly,
    active: true,
  }
}

function validPMTask(): PMTask {
  return {
    pmTaskId: 'pmtask-1',
    pmTemplateId: 'pmt-1',
    equipmentId: 'eq-1',
    scheduledDate: '2026-03-01',
    completedDate: null,
    completedByPersonId: null,
    status: PMStatus.Scheduled,
    notes: '',
    generatedIssueId: null,
  }
}

function fieldError(errors: ValidationError[], field: string): ValidationError | undefined {
  return errors.find((e) => e.field === field)
}

// ---------------------------------------------------------------------------
// Equipment validation
// ---------------------------------------------------------------------------

describe('validateEquipment', () => {
  it('returns no errors for a valid team-owned equipment', () => {
    const errors = validateEquipment(validEquipment())
    expect(errors).toHaveLength(0)
  })

  it('returns no errors for a valid person-owned equipment', () => {
    const eq = {
      ...validEquipment(),
      ownerType: OwnerType.Person,
      ownerTeamId: null,
      ownerPersonId: 'person-1',
    }
    const errors = validateEquipment(eq)
    expect(errors).toHaveLength(0)
  })

  // Required field tests
  it.each(['name', 'equipmentCode', 'ownerType', 'status'] as const)(
    'returns error when %s is missing',
    (field) => {
      const eq = { ...validEquipment(), [field]: undefined }
      const errors = validateEquipment(eq)
      expect(fieldError(errors, field)).toBeDefined()
      expect(fieldError(errors, field)).toBeInstanceOf(ValidationError)
    },
  )

  it('returns error when equipmentCode is an empty string', () => {
    const eq = { ...validEquipment(), equipmentCode: '' }
    const errors = validateEquipment(eq)
    expect(fieldError(errors, 'equipmentCode')).toBeDefined()
  })

  it('returns error when equipmentCode is only whitespace', () => {
    const eq = { ...validEquipment(), equipmentCode: '   ' }
    const errors = validateEquipment(eq)
    expect(fieldError(errors, 'equipmentCode')).toBeDefined()
  })

  // OwnerType consistency: Team
  it('returns error when ownerType is Team but ownerTeamId is missing', () => {
    const eq = { ...validEquipment(), ownerTeamId: undefined }
    const errors = validateEquipment(eq)
    expect(fieldError(errors, 'ownerTeamId')).toBeDefined()
  })

  it('returns error when ownerType is Team but ownerPersonId is not null', () => {
    const eq = { ...validEquipment(), ownerPersonId: 'person-1' }
    const errors = validateEquipment(eq)
    expect(fieldError(errors, 'ownerPersonId')).toBeDefined()
  })

  // OwnerType consistency: Person
  it('returns error when ownerType is Person but ownerPersonId is missing', () => {
    const eq = {
      ...validEquipment(),
      ownerType: OwnerType.Person,
      ownerTeamId: null,
      ownerPersonId: undefined,
    }
    const errors = validateEquipment(eq)
    expect(fieldError(errors, 'ownerPersonId')).toBeDefined()
  })

  it('returns error when ownerType is Person but ownerTeamId is not null', () => {
    const eq = {
      ...validEquipment(),
      ownerType: OwnerType.Person,
      ownerTeamId: 'team-1',
      ownerPersonId: 'person-1',
    }
    const errors = validateEquipment(eq)
    expect(fieldError(errors, 'ownerTeamId')).toBeDefined()
  })

  // Self-reference
  it('returns error when parentEquipmentId references itself', () => {
    const eq = { ...validEquipment(), parentEquipmentId: 'eq-1' }
    const errors = validateEquipment(eq)
    expect(fieldError(errors, 'parentEquipmentId')).toBeDefined()
  })

  it('allows parentEquipmentId to reference a different equipment', () => {
    const eq = { ...validEquipment(), parentEquipmentId: 'eq-2' }
    const errors = validateEquipment(eq)
    expect(fieldError(errors, 'parentEquipmentId')).toBeUndefined()
  })

  it('allows null parentEquipmentId', () => {
    const eq = { ...validEquipment(), parentEquipmentId: null }
    const errors = validateEquipment(eq)
    expect(fieldError(errors, 'parentEquipmentId')).toBeUndefined()
  })

  it('returns multiple errors when multiple fields are missing', () => {
    const errors = validateEquipment({})
    expect(errors.length).toBeGreaterThanOrEqual(4)
  })
})

// ---------------------------------------------------------------------------
// LoanTransfer validation
// ---------------------------------------------------------------------------

describe('validateLoanTransfer', () => {
  it('returns no errors for a valid loan transfer', () => {
    const errors = validateLoanTransfer(validLoanTransfer())
    expect(errors).toHaveLength(0)
  })

  it('returns no errors for a valid internal transfer', () => {
    const loan = {
      ...validLoanTransfer(),
      originTeamId: 'team-1',
      recipientTeamId: 'team-1',
      isInternalTransfer: true,
    }
    const errors = validateLoanTransfer(loan)
    expect(errors).toHaveLength(0)
  })

  // Required field tests
  it.each([
    'equipmentId',
    'startDate',
    'dueDate',
    'originTeamId',
    'recipientTeamId',
    'reasonCode',
    'approverPersonId',
    'status',
  ] as const)('returns error when %s is missing', (field) => {
    const loan = { ...validLoanTransfer(), [field]: undefined }
    const errors = validateLoanTransfer(loan)
    expect(fieldError(errors, field)).toBeDefined()
    expect(fieldError(errors, field)).toBeInstanceOf(ValidationError)
  })

  // Date ordering
  it('returns error when dueDate is before startDate', () => {
    const loan = {
      ...validLoanTransfer(),
      startDate: '2026-02-01',
      dueDate: '2026-01-15',
    }
    const errors = validateLoanTransfer(loan)
    expect(fieldError(errors, 'dueDate')).toBeDefined()
  })

  it('allows dueDate equal to startDate', () => {
    const loan = {
      ...validLoanTransfer(),
      startDate: '2026-01-15',
      dueDate: '2026-01-15',
    }
    const errors = validateLoanTransfer(loan)
    expect(fieldError(errors, 'dueDate')).toBeUndefined()
  })

  it('allows dueDate after startDate', () => {
    const loan = validLoanTransfer()
    const errors = validateLoanTransfer(loan)
    expect(fieldError(errors, 'dueDate')).toBeUndefined()
  })

  // Internal transfer rules
  it('returns error when isInternalTransfer is true but teams differ', () => {
    const loan = {
      ...validLoanTransfer(),
      isInternalTransfer: true,
    }
    const errors = validateLoanTransfer(loan)
    expect(fieldError(errors, 'originTeamId')).toBeDefined()
  })

  it('returns error when teams are the same but isInternalTransfer is false', () => {
    const loan = {
      ...validLoanTransfer(),
      originTeamId: 'team-1',
      recipientTeamId: 'team-1',
      isInternalTransfer: false,
    }
    const errors = validateLoanTransfer(loan)
    expect(fieldError(errors, 'isInternalTransfer')).toBeDefined()
  })

  it('returns multiple errors when multiple fields are missing', () => {
    const errors = validateLoanTransfer({})
    expect(errors.length).toBeGreaterThanOrEqual(8)
  })
})

// ---------------------------------------------------------------------------
// Team validation
// ---------------------------------------------------------------------------

describe('validateTeam', () => {
  it('returns no errors for a valid team', () => {
    const errors = validateTeam(validTeam())
    expect(errors).toHaveLength(0)
  })

  it('returns error when name is missing', () => {
    const team = { ...validTeam(), name: undefined }
    const errors = validateTeam(team)
    expect(fieldError(errors, 'name')).toBeDefined()
    expect(fieldError(errors, 'name')).toBeInstanceOf(ValidationError)
  })

  it('returns error when teamCode is missing', () => {
    const team = { ...validTeam(), teamCode: undefined }
    const errors = validateTeam(team)
    expect(fieldError(errors, 'teamCode')).toBeDefined()
    expect(fieldError(errors, 'teamCode')).toBeInstanceOf(ValidationError)
  })

  it('returns errors for both missing name and teamCode', () => {
    const errors = validateTeam({})
    expect(errors).toHaveLength(2)
    expect(fieldError(errors, 'name')).toBeDefined()
    expect(fieldError(errors, 'teamCode')).toBeDefined()
  })

  it('returns error when name is empty string', () => {
    const team = { ...validTeam(), name: '' }
    const errors = validateTeam(team)
    expect(fieldError(errors, 'name')).toBeDefined()
  })

  it('returns error when teamCode is empty string', () => {
    const team = { ...validTeam(), teamCode: '' }
    const errors = validateTeam(team)
    expect(fieldError(errors, 'teamCode')).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Location validation
// ---------------------------------------------------------------------------

describe('validateLocation', () => {
  it('returns no errors for a valid location', () => {
    const errors = validateLocation(validLocation())
    expect(errors).toHaveLength(0)
  })

  it.each(['name', 'buildingId', 'levelId'] as const)(
    'returns error when %s is missing',
    (field) => {
      const loc = { ...validLocation(), [field]: undefined }
      const errors = validateLocation(loc)
      expect(fieldError(errors, field)).toBeDefined()
      expect(fieldError(errors, field)).toBeInstanceOf(ValidationError)
    },
  )

  it('returns all errors when all required fields are missing', () => {
    const errors = validateLocation({})
    expect(errors).toHaveLength(3)
    expect(fieldError(errors, 'name')).toBeDefined()
    expect(fieldError(errors, 'buildingId')).toBeDefined()
    expect(fieldError(errors, 'levelId')).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Person validation
// ---------------------------------------------------------------------------

describe('validatePerson', () => {
  it('returns no errors for a valid person', () => {
    const errors = validatePerson(validPerson())
    expect(errors).toHaveLength(0)
  })

  it('returns error when displayName is missing', () => {
    const person = { ...validPerson(), displayName: undefined }
    const errors = validatePerson(person)
    expect(fieldError(errors, 'displayName')).toBeDefined()
    expect(fieldError(errors, 'displayName')).toBeInstanceOf(ValidationError)
  })

  it('returns error when email is missing', () => {
    const person = { ...validPerson(), email: undefined }
    const errors = validatePerson(person)
    expect(fieldError(errors, 'email')).toBeDefined()
    expect(fieldError(errors, 'email')).toBeInstanceOf(ValidationError)
  })

  it('returns error when email is empty string', () => {
    const person = { ...validPerson(), email: '' }
    const errors = validatePerson(person)
    expect(fieldError(errors, 'email')).toBeDefined()
  })

  // Email format validation
  it.each(['not-an-email', 'missing@domain', '@no-local.com', 'spaces in@email.com', 'no@dots'])(
    'returns error for invalid email: %s',
    (badEmail) => {
      const person = { ...validPerson(), email: badEmail }
      const errors = validatePerson(person)
      expect(fieldError(errors, 'email')).toBeDefined()
      expect(fieldError(errors, 'email')?.message).toContain('valid email')
    },
  )

  it.each(['user@example.com', 'first.last@hospital.org.au', 'test+tag@rbwh.edu.au'])(
    'accepts valid email: %s',
    (goodEmail) => {
      const person = { ...validPerson(), email: goodEmail }
      const errors = validatePerson(person)
      expect(fieldError(errors, 'email')).toBeUndefined()
    },
  )

  it('returns errors for both missing displayName and email', () => {
    const errors = validatePerson({})
    expect(errors).toHaveLength(2)
    expect(fieldError(errors, 'displayName')).toBeDefined()
    expect(fieldError(errors, 'email')).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// EquipmentIssue validation
// ---------------------------------------------------------------------------

describe('validateEquipmentIssue', () => {
  it('returns no errors for a valid equipment issue', () => {
    const errors = validateEquipmentIssue(validEquipmentIssue())
    expect(errors).toHaveLength(0)
  })

  it.each([
    'title',
    'equipmentId',
    'reportedByPersonId',
    'status',
    'priority',
    'dueDate',
  ] as const)('returns error when %s is missing', (field) => {
    const issue = { ...validEquipmentIssue(), [field]: undefined }
    const errors = validateEquipmentIssue(issue)
    expect(fieldError(errors, field)).toBeDefined()
    expect(fieldError(errors, field)).toBeInstanceOf(ValidationError)
  })

  it('returns error when title is empty string', () => {
    const issue = { ...validEquipmentIssue(), title: '' }
    const errors = validateEquipmentIssue(issue)
    expect(fieldError(errors, 'title')).toBeDefined()
  })

  it('returns multiple errors when multiple fields are missing', () => {
    const errors = validateEquipmentIssue({})
    expect(errors.length).toBeGreaterThanOrEqual(6)
  })
})

// ---------------------------------------------------------------------------
// IssueNote validation
// ---------------------------------------------------------------------------

describe('validateIssueNote', () => {
  it('returns no errors for a valid issue note', () => {
    const errors = validateIssueNote(validIssueNote())
    expect(errors).toHaveLength(0)
  })

  it.each(['issueId', 'authorPersonId', 'content'] as const)(
    'returns error when %s is missing',
    (field) => {
      const note = { ...validIssueNote(), [field]: undefined }
      const errors = validateIssueNote(note)
      expect(fieldError(errors, field)).toBeDefined()
      expect(fieldError(errors, field)).toBeInstanceOf(ValidationError)
    },
  )

  it('returns error when content is empty string', () => {
    const note = { ...validIssueNote(), content: '' }
    const errors = validateIssueNote(note)
    expect(fieldError(errors, 'content')).toBeDefined()
  })

  it('returns multiple errors when multiple fields are missing', () => {
    const errors = validateIssueNote({})
    expect(errors.length).toBeGreaterThanOrEqual(3)
  })
})

// ---------------------------------------------------------------------------
// CorrectiveAction validation
// ---------------------------------------------------------------------------

describe('validateCorrectiveAction', () => {
  it('returns no errors for a valid corrective action', () => {
    const errors = validateCorrectiveAction(validCorrectiveAction())
    expect(errors).toHaveLength(0)
  })

  it.each(['issueId', 'description', 'assignedToPersonId', 'status'] as const)(
    'returns error when %s is missing',
    (field) => {
      const action = { ...validCorrectiveAction(), [field]: undefined }
      const errors = validateCorrectiveAction(action)
      expect(fieldError(errors, field)).toBeDefined()
      expect(fieldError(errors, field)).toBeInstanceOf(ValidationError)
    },
  )

  it('returns error when description is empty string', () => {
    const action = { ...validCorrectiveAction(), description: '' }
    const errors = validateCorrectiveAction(action)
    expect(fieldError(errors, 'description')).toBeDefined()
  })

  it('returns multiple errors when multiple fields are missing', () => {
    const errors = validateCorrectiveAction({})
    expect(errors.length).toBeGreaterThanOrEqual(4)
  })
})

// ---------------------------------------------------------------------------
// PMTemplate validation
// ---------------------------------------------------------------------------

describe('validatePMTemplate', () => {
  it('returns no errors for a valid PM template', () => {
    const errors = validatePMTemplate(validPMTemplate())
    expect(errors).toHaveLength(0)
  })

  it.each(['name', 'equipmentId', 'frequency'] as const)(
    'returns error when %s is missing',
    (field) => {
      const template = { ...validPMTemplate(), [field]: undefined }
      const errors = validatePMTemplate(template)
      expect(fieldError(errors, field)).toBeDefined()
      expect(fieldError(errors, field)).toBeInstanceOf(ValidationError)
    },
  )

  it('returns multiple errors when multiple fields are missing', () => {
    const errors = validatePMTemplate({})
    expect(errors.length).toBeGreaterThanOrEqual(3)
  })
})

// ---------------------------------------------------------------------------
// PMTask validation
// ---------------------------------------------------------------------------

describe('validatePMTask', () => {
  it('returns no errors for a valid PM task', () => {
    const errors = validatePMTask(validPMTask())
    expect(errors).toHaveLength(0)
  })

  it.each(['pmTemplateId', 'equipmentId', 'scheduledDate', 'status'] as const)(
    'returns error when %s is missing',
    (field) => {
      const task = { ...validPMTask(), [field]: undefined }
      const errors = validatePMTask(task)
      expect(fieldError(errors, field)).toBeDefined()
      expect(fieldError(errors, field)).toBeInstanceOf(ValidationError)
    },
  )

  it('returns error when completedDate is before scheduledDate', () => {
    const task = {
      ...validPMTask(),
      scheduledDate: '2026-03-01',
      completedDate: '2026-02-15',
    }
    const errors = validatePMTask(task)
    expect(fieldError(errors, 'completedDate')).toBeDefined()
  })

  it('allows completedDate equal to scheduledDate', () => {
    const task = {
      ...validPMTask(),
      scheduledDate: '2026-03-01',
      completedDate: '2026-03-01',
    }
    const errors = validatePMTask(task)
    expect(fieldError(errors, 'completedDate')).toBeUndefined()
  })

  it('returns multiple errors when multiple fields are missing', () => {
    const errors = validatePMTask({})
    expect(errors.length).toBeGreaterThanOrEqual(4)
  })
})
