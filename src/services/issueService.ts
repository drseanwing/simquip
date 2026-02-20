import type {
  CorrectiveAction,
  Equipment,
  EquipmentIssue,
  IssueNote,
  Person,
} from '../types'
import { CorrectiveActionStatus, EquipmentStatus, IssueStatus, IssuePriority } from '../types'
import type { DataService, ListOptions, PagedResult } from './dataService'
import { validateCorrectiveAction, validateEquipmentIssue, validateIssueNote } from './validators'

/** Default due-date offset in days from issue creation. */
const DEFAULT_DUE_DAYS = 7

/** Compute an ISO date string N days from now. */
function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Returns today's date as ISO string. */
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Domain service for Issue / Corrective Action tracking (Module 1).
 *
 * Encapsulates business rules such as automatic due-date population,
 * equipment-status updates on corrective action completion, and
 * notification integration points.
 */
export class IssueService {
  private readonly issueDataService: DataService<EquipmentIssue>
  private readonly noteDataService: DataService<IssueNote>
  private readonly actionDataService: DataService<CorrectiveAction>
  private readonly equipmentDataService: DataService<Equipment>
  private readonly personDataService: DataService<Person>

  constructor(
    issueDataService: DataService<EquipmentIssue>,
    noteDataService: DataService<IssueNote>,
    actionDataService: DataService<CorrectiveAction>,
    equipmentDataService: DataService<Equipment>,
    personDataService: DataService<Person>,
  ) {
    this.issueDataService = issueDataService
    this.noteDataService = noteDataService
    this.actionDataService = actionDataService
    this.equipmentDataService = equipmentDataService
    this.personDataService = personDataService
  }

  // ── Issues ──────────────────────────────────────────────────────────────

  /** List issues, optionally filtered. */
  getIssues(options?: ListOptions): Promise<PagedResult<EquipmentIssue>> {
    return this.issueDataService.getAll(options)
  }

  /** Get a single issue by ID. */
  getIssueById(id: string): Promise<EquipmentIssue> {
    return this.issueDataService.getById(id)
  }

  /** List issues for a specific equipment item. */
  async getIssuesForEquipment(equipmentId: string): Promise<EquipmentIssue[]> {
    const sanitizedId = equipmentId.replace(/'/g, "''")
    const result = await this.issueDataService.getAll({
      filter: `equipmentId eq '${sanitizedId}'`,
      orderBy: 'createdOn desc',
      top: 500,
    })
    return result.data
  }

  /**
   * Create a new issue with automatic due-date (7 days from now).
   * Returns the owner's email for notification (caller is responsible
   * for triggering notification via Power Automate or similar).
   */
  async createIssue(
    issue: Partial<EquipmentIssue>,
  ): Promise<{ issue: EquipmentIssue; ownerEmail: string | null }> {
    const withDefaults: Partial<EquipmentIssue> = {
      ...issue,
      status: issue.status ?? IssueStatus.Open,
      priority: issue.priority ?? IssuePriority.Medium,
      dueDate: issue.dueDate ?? addDays(DEFAULT_DUE_DAYS),
      createdOn: issue.createdOn ?? today(),
      resolvedOn: null,
      active: true,
    }

    const errors = validateEquipmentIssue(withDefaults)
    if (errors.length > 0) throw errors[0]

    const created = await this.issueDataService.create(withDefaults)

    // Resolve equipment owner email for notification
    let ownerEmail: string | null = null
    if (issue.equipmentId) {
      ownerEmail = await this.resolveOwnerEmail(issue.equipmentId)
    }

    return { issue: created, ownerEmail }
  }

  /** Update an issue. Automatically sets resolvedOn when status becomes Resolved/Closed. */
  async updateIssue(
    id: string,
    updates: Partial<EquipmentIssue>,
  ): Promise<EquipmentIssue> {
    const existing = await this.issueDataService.getById(id)
    const merged = { ...existing, ...updates }

    // Auto-populate resolvedOn
    if (
      (merged.status === IssueStatus.Resolved || merged.status === IssueStatus.Closed) &&
      !merged.resolvedOn
    ) {
      merged.resolvedOn = today()
    }

    const errors = validateEquipmentIssue(merged)
    if (errors.length > 0) throw errors[0]

    return this.issueDataService.update(id, updates)
  }

  // ── Notes (conversation-style) ──────────────────────────────────────────

  /** List all notes for an issue, ordered by creation date. */
  async getNotesForIssue(issueId: string): Promise<IssueNote[]> {
    const sanitizedId = issueId.replace(/'/g, "''")
    const result = await this.noteDataService.getAll({
      filter: `issueId eq '${sanitizedId}'`,
      orderBy: 'createdOn asc',
      top: 500,
    })
    return result.data
  }

  /** Add a conversation note to an issue. */
  async addNote(note: Partial<IssueNote>): Promise<IssueNote> {
    const withDefaults: Partial<IssueNote> = {
      ...note,
      createdOn: note.createdOn ?? new Date().toISOString(),
    }

    const errors = validateIssueNote(withDefaults)
    if (errors.length > 0) throw errors[0]

    return this.noteDataService.create(withDefaults)
  }

  // ── Corrective Actions ──────────────────────────────────────────────────

  /** List corrective actions for an issue. */
  async getActionsForIssue(issueId: string): Promise<CorrectiveAction[]> {
    const sanitizedId = issueId.replace(/'/g, "''")
    const result = await this.actionDataService.getAll({
      filter: `issueId eq '${sanitizedId}'`,
      orderBy: 'createdOn asc',
      top: 500,
    })
    return result.data
  }

  /** Create a corrective action for an issue. */
  async createAction(action: Partial<CorrectiveAction>): Promise<CorrectiveAction> {
    const withDefaults: Partial<CorrectiveAction> = {
      ...action,
      status: action.status ?? CorrectiveActionStatus.Planned,
      createdOn: action.createdOn ?? new Date().toISOString(),
    }

    const errors = validateCorrectiveAction(withDefaults)
    if (errors.length > 0) throw errors[0]

    return this.actionDataService.create(withDefaults)
  }

  /**
   * Complete a corrective action. If `equipmentStatusChange` is set,
   * automatically updates the equipment status.
   */
  async completeAction(
    actionId: string,
    equipmentStatusChange?: EquipmentStatus,
  ): Promise<CorrectiveAction> {
    const existing = await this.actionDataService.getById(actionId)

    const updates: Partial<CorrectiveAction> = {
      status: CorrectiveActionStatus.Completed,
      completedOn: new Date().toISOString(),
    }

    if (equipmentStatusChange) {
      updates.equipmentStatusChange = equipmentStatusChange

      // Resolve the issue to get the equipment ID, then update equipment status
      const issue = await this.issueDataService.getById(existing.issueId)
      await this.equipmentDataService.update(issue.equipmentId, {
        status: equipmentStatusChange,
      } as Partial<Equipment>)
    }

    return this.actionDataService.update(actionId, updates)
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Resolve the email of the equipment owner (team contact or person). */
  private async resolveOwnerEmail(equipmentId: string): Promise<string | null> {
    try {
      const equipment = await this.equipmentDataService.getById(equipmentId)
      if (equipment.contactPersonId) {
        const person = await this.personDataService.getById(equipment.contactPersonId)
        return person.email
      }
      if (equipment.ownerPersonId) {
        const person = await this.personDataService.getById(equipment.ownerPersonId)
        return person.email
      }
    } catch {
      // Non-fatal; notification can be skipped
    }
    return null
  }
}
