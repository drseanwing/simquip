import { ValidationError } from '../errors'
import { OwnerType } from '../types'
import type {
  CorrectiveAction,
  Equipment,
  EquipmentIssue,
  IssueNote,
  LoanTransfer,
  Team,
  Location,
  Person,
  PMTemplate,
  PMTask,
} from '../types'

/**
 * Validates a simple email format: non-empty local part, @, non-empty domain with dot.
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Validates an Equipment entity against business rules (spec section 4.7).
 *
 * Rules:
 * - Required: name, equipmentCode, ownerType, status
 * - equipmentCode must be a non-empty string
 * - If ownerType is Team, ownerTeamId is required and ownerPersonId must be null
 * - If ownerType is Person, ownerPersonId is required and ownerTeamId must be null
 * - parentEquipmentId cannot reference itself
 */
export function validateEquipment(equipment: Partial<Equipment>): ValidationError[] {
  const errors: ValidationError[] = []

  if (!equipment.name) {
    errors.push(new ValidationError('name is required', 'name'))
  }

  if (!equipment.equipmentCode) {
    errors.push(new ValidationError('equipmentCode is required', 'equipmentCode'))
  } else if (typeof equipment.equipmentCode === 'string' && equipment.equipmentCode.trim() === '') {
    errors.push(new ValidationError('equipmentCode must be a non-empty string', 'equipmentCode'))
  }

  if (!equipment.ownerType) {
    errors.push(new ValidationError('ownerType is required', 'ownerType'))
  }

  if (!equipment.status) {
    errors.push(new ValidationError('status is required', 'status'))
  }

  // Owner consistency rules
  if (equipment.ownerType === OwnerType.Team) {
    if (!equipment.ownerTeamId) {
      errors.push(
        new ValidationError('ownerTeamId is required when ownerType is Team', 'ownerTeamId'),
      )
    }
    if (equipment.ownerPersonId != null) {
      errors.push(
        new ValidationError('ownerPersonId must be null when ownerType is Team', 'ownerPersonId'),
      )
    }
  }

  if (equipment.ownerType === OwnerType.Person) {
    if (!equipment.ownerPersonId) {
      errors.push(
        new ValidationError('ownerPersonId is required when ownerType is Person', 'ownerPersonId'),
      )
    }
    if (equipment.ownerTeamId != null) {
      errors.push(
        new ValidationError('ownerTeamId must be null when ownerType is Person', 'ownerTeamId'),
      )
    }
  }

  // Self-reference check
  if (
    equipment.parentEquipmentId &&
    equipment.equipmentId &&
    equipment.parentEquipmentId === equipment.equipmentId
  ) {
    errors.push(
      new ValidationError('parentEquipmentId cannot reference itself', 'parentEquipmentId'),
    )
  }

  return errors
}

/**
 * Validates a LoanTransfer entity against business rules (spec section 4.10).
 *
 * Rules:
 * - Required: equipmentId, startDate, dueDate, originTeamId, recipientTeamId,
 *             reasonCode, approverPersonId, status
 * - dueDate must be >= startDate
 * - If isInternalTransfer is true, originTeamId must equal recipientTeamId
 * - If originTeamId equals recipientTeamId, isInternalTransfer must be true
 */
export function validateLoanTransfer(loan: Partial<LoanTransfer>): ValidationError[] {
  const errors: ValidationError[] = []

  if (!loan.equipmentId) {
    errors.push(new ValidationError('equipmentId is required', 'equipmentId'))
  }

  if (!loan.startDate) {
    errors.push(new ValidationError('startDate is required', 'startDate'))
  }

  if (!loan.dueDate) {
    errors.push(new ValidationError('dueDate is required', 'dueDate'))
  }

  if (!loan.originTeamId) {
    errors.push(new ValidationError('originTeamId is required', 'originTeamId'))
  }

  if (!loan.recipientTeamId) {
    errors.push(new ValidationError('recipientTeamId is required', 'recipientTeamId'))
  }

  if (!loan.reasonCode) {
    errors.push(new ValidationError('reasonCode is required', 'reasonCode'))
  }

  if (!loan.approverPersonId) {
    errors.push(new ValidationError('approverPersonId is required', 'approverPersonId'))
  }

  if (!loan.status) {
    errors.push(new ValidationError('status is required', 'status'))
  }

  // Date ordering: dueDate >= startDate
  if (loan.startDate && loan.dueDate && loan.dueDate < loan.startDate) {
    errors.push(
      new ValidationError('dueDate must be greater than or equal to startDate', 'dueDate'),
    )
  }

  // Internal transfer consistency
  if (loan.isInternalTransfer === true && loan.originTeamId && loan.recipientTeamId) {
    if (loan.originTeamId !== loan.recipientTeamId) {
      errors.push(
        new ValidationError(
          'originTeamId must equal recipientTeamId when isInternalTransfer is true',
          'originTeamId',
        ),
      )
    }
  }

  if (
    loan.originTeamId &&
    loan.recipientTeamId &&
    loan.originTeamId === loan.recipientTeamId &&
    loan.isInternalTransfer !== true
  ) {
    errors.push(
      new ValidationError(
        'isInternalTransfer must be true when originTeamId equals recipientTeamId',
        'isInternalTransfer',
      ),
    )
  }

  return errors
}

/**
 * Validates a Team entity against business rules (spec section 4.2).
 *
 * Rules:
 * - Required: name, teamCode
 */
export function validateTeam(team: Partial<Team>): ValidationError[] {
  const errors: ValidationError[] = []

  if (!team.name) {
    errors.push(new ValidationError('name is required', 'name'))
  }

  if (!team.teamCode) {
    errors.push(new ValidationError('teamCode is required', 'teamCode'))
  }

  return errors
}

/**
 * Validates a Location entity against business rules (spec section 4.6).
 *
 * Rules:
 * - Required: name, buildingId, levelId
 */
export function validateLocation(location: Partial<Location>): ValidationError[] {
  const errors: ValidationError[] = []

  if (!location.name) {
    errors.push(new ValidationError('name is required', 'name'))
  }

  if (!location.buildingId) {
    errors.push(new ValidationError('buildingId is required', 'buildingId'))
  }

  if (!location.levelId) {
    errors.push(new ValidationError('levelId is required', 'levelId'))
  }

  return errors
}

/**
 * Validates a Person entity against business rules (spec section 4.1).
 *
 * Rules:
 * - Required: displayName, email
 * - email must be a valid format
 */
export function validatePerson(person: Partial<Person>): ValidationError[] {
  const errors: ValidationError[] = []

  if (!person.displayName) {
    errors.push(new ValidationError('displayName is required', 'displayName'))
  }

  if (!person.email) {
    errors.push(new ValidationError('email is required', 'email'))
  } else if (!isValidEmail(person.email)) {
    errors.push(new ValidationError('email must be a valid email address', 'email'))
  }

  return errors
}

// ── Module 1: Issue / Corrective Action validators ─────────────────────────

/**
 * Validates an EquipmentIssue entity.
 *
 * Rules:
 * - Required: title, equipmentId, reportedByPersonId, status, priority, dueDate
 * - title must be a non-empty string
 */
export function validateEquipmentIssue(issue: Partial<EquipmentIssue>): ValidationError[] {
  const errors: ValidationError[] = []

  if (!issue.title) {
    errors.push(new ValidationError('title is required', 'title'))
  } else if (typeof issue.title === 'string' && issue.title.trim() === '') {
    errors.push(new ValidationError('title must be a non-empty string', 'title'))
  }

  if (!issue.equipmentId) {
    errors.push(new ValidationError('equipmentId is required', 'equipmentId'))
  }

  if (!issue.reportedByPersonId) {
    errors.push(new ValidationError('reportedByPersonId is required', 'reportedByPersonId'))
  }

  if (!issue.status) {
    errors.push(new ValidationError('status is required', 'status'))
  }

  if (!issue.priority) {
    errors.push(new ValidationError('priority is required', 'priority'))
  }

  if (!issue.dueDate) {
    errors.push(new ValidationError('dueDate is required', 'dueDate'))
  }

  return errors
}

/**
 * Validates an IssueNote entity.
 *
 * Rules:
 * - Required: issueId, authorPersonId, content
 * - content must be a non-empty string
 */
export function validateIssueNote(note: Partial<IssueNote>): ValidationError[] {
  const errors: ValidationError[] = []

  if (!note.issueId) {
    errors.push(new ValidationError('issueId is required', 'issueId'))
  }

  if (!note.authorPersonId) {
    errors.push(new ValidationError('authorPersonId is required', 'authorPersonId'))
  }

  if (!note.content) {
    errors.push(new ValidationError('content is required', 'content'))
  } else if (typeof note.content === 'string' && note.content.trim() === '') {
    errors.push(new ValidationError('content must be a non-empty string', 'content'))
  }

  return errors
}

/**
 * Validates a CorrectiveAction entity.
 *
 * Rules:
 * - Required: issueId, description, assignedToPersonId, status
 * - description must be a non-empty string
 */
export function validateCorrectiveAction(action: Partial<CorrectiveAction>): ValidationError[] {
  const errors: ValidationError[] = []

  if (!action.issueId) {
    errors.push(new ValidationError('issueId is required', 'issueId'))
  }

  if (!action.description) {
    errors.push(new ValidationError('description is required', 'description'))
  } else if (typeof action.description === 'string' && action.description.trim() === '') {
    errors.push(new ValidationError('description must be a non-empty string', 'description'))
  }

  if (!action.assignedToPersonId) {
    errors.push(new ValidationError('assignedToPersonId is required', 'assignedToPersonId'))
  }

  if (!action.status) {
    errors.push(new ValidationError('status is required', 'status'))
  }

  return errors
}

// ── Module 2: Preventative Maintenance validators ──────────────────────────

/**
 * Validates a PMTemplate entity.
 *
 * Rules:
 * - Required: name, equipmentId, frequency
 */
export function validatePMTemplate(template: Partial<PMTemplate>): ValidationError[] {
  const errors: ValidationError[] = []

  if (!template.name) {
    errors.push(new ValidationError('name is required', 'name'))
  }

  if (!template.equipmentId) {
    errors.push(new ValidationError('equipmentId is required', 'equipmentId'))
  }

  if (!template.frequency) {
    errors.push(new ValidationError('frequency is required', 'frequency'))
  }

  return errors
}

/**
 * Validates a PMTask entity.
 *
 * Rules:
 * - Required: pmTemplateId, equipmentId, scheduledDate, status
 * - completedDate >= scheduledDate when present
 */
export function validatePMTask(task: Partial<PMTask>): ValidationError[] {
  const errors: ValidationError[] = []

  if (!task.pmTemplateId) {
    errors.push(new ValidationError('pmTemplateId is required', 'pmTemplateId'))
  }

  if (!task.equipmentId) {
    errors.push(new ValidationError('equipmentId is required', 'equipmentId'))
  }

  if (!task.scheduledDate) {
    errors.push(new ValidationError('scheduledDate is required', 'scheduledDate'))
  }

  if (!task.status) {
    errors.push(new ValidationError('status is required', 'status'))
  }

  if (task.completedDate && task.scheduledDate && task.completedDate < task.scheduledDate) {
    errors.push(
      new ValidationError(
        'completedDate must be greater than or equal to scheduledDate',
        'completedDate',
      ),
    )
  }

  return errors
}
