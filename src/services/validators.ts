import { ValidationError } from '../errors'
import { OwnerType } from '../types'
import type { Equipment, LoanTransfer, Team, Location, Person } from '../types'

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
