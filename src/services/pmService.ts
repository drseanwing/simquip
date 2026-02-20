import type {
  EquipmentIssue,
  PMTask,
  PMTaskItem,
  PMTemplate,
  PMTemplateItem,
} from '../types'
import {
  IssueStatus,
  IssuePriority,
  PMChecklistItemStatus,
  PMStatus,
} from '../types'
import { computeNextPMDate } from '../utils/dateUtils'
import type { DataService, ListOptions, PagedResult } from './dataService'
import { validatePMTask, validatePMTemplate } from './validators'

/** Returns today's date as ISO string. */
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Domain service for Preventative Maintenance tracking (Module 2).
 *
 * Manages PM templates with checklist items, PM task execution,
 * automatic creation of next PM task on completion, and
 * auto-generation of issues when PM checklist items fail.
 */
export class PMService {
  private readonly templateDataService: DataService<PMTemplate>
  private readonly templateItemDataService: DataService<PMTemplateItem>
  private readonly taskDataService: DataService<PMTask>
  private readonly taskItemDataService: DataService<PMTaskItem>
  private readonly issueDataService: DataService<EquipmentIssue>

  constructor(
    templateDataService: DataService<PMTemplate>,
    templateItemDataService: DataService<PMTemplateItem>,
    taskDataService: DataService<PMTask>,
    taskItemDataService: DataService<PMTaskItem>,
    issueDataService: DataService<EquipmentIssue>,
  ) {
    this.templateDataService = templateDataService
    this.templateItemDataService = templateItemDataService
    this.taskDataService = taskDataService
    this.taskItemDataService = taskItemDataService
    this.issueDataService = issueDataService
  }

  // ── PM Templates ────────────────────────────────────────────────────────

  /** List all PM templates, optionally filtered. */
  getTemplates(options?: ListOptions): Promise<PagedResult<PMTemplate>> {
    return this.templateDataService.getAll(options)
  }

  /** Get a single PM template by ID. */
  getTemplateById(id: string): Promise<PMTemplate> {
    return this.templateDataService.getById(id)
  }

  /** List templates for a specific equipment item. */
  async getTemplatesForEquipment(equipmentId: string): Promise<PMTemplate[]> {
    const sanitizedId = equipmentId.replace(/'/g, "''")
    const result = await this.templateDataService.getAll({
      filter: `equipmentId eq '${sanitizedId}'`,
      top: 500,
    })
    return result.data
  }

  /** Create a PM template with validation. */
  async createTemplate(template: Partial<PMTemplate>): Promise<PMTemplate> {
    const withDefaults: Partial<PMTemplate> = {
      ...template,
      active: template.active ?? true,
    }

    const errors = validatePMTemplate(withDefaults)
    if (errors.length > 0) throw errors[0]

    return this.templateDataService.create(withDefaults)
  }

  /** Update a PM template. */
  async updateTemplate(id: string, updates: Partial<PMTemplate>): Promise<PMTemplate> {
    return this.templateDataService.update(id, updates)
  }

  // ── PM Template Items (checklist definitions) ───────────────────────────

  /** Get checklist items for a template, sorted by sortOrder. */
  async getTemplateItems(templateId: string): Promise<PMTemplateItem[]> {
    const sanitizedId = templateId.replace(/'/g, "''")
    const result = await this.templateItemDataService.getAll({
      filter: `pmTemplateId eq '${sanitizedId}'`,
      orderBy: 'sortOrder asc',
      top: 500,
    })
    return result.data
  }

  /** Add a checklist item to a template. */
  async addTemplateItem(item: Partial<PMTemplateItem>): Promise<PMTemplateItem> {
    return this.templateItemDataService.create(item)
  }

  /** Update a template item. */
  async updateTemplateItem(
    id: string,
    updates: Partial<PMTemplateItem>,
  ): Promise<PMTemplateItem> {
    return this.templateItemDataService.update(id, updates)
  }

  /** Delete a template item. */
  async deleteTemplateItem(id: string): Promise<void> {
    return this.templateItemDataService.delete(id)
  }

  // ── PM Tasks ────────────────────────────────────────────────────────────

  /** List PM tasks, optionally filtered. */
  getTasks(options?: ListOptions): Promise<PagedResult<PMTask>> {
    return this.taskDataService.getAll(options)
  }

  /** Get a single PM task by ID. */
  getTaskById(id: string): Promise<PMTask> {
    return this.taskDataService.getById(id)
  }

  /** List tasks for a specific equipment item. */
  async getTasksForEquipment(equipmentId: string): Promise<PMTask[]> {
    const sanitizedId = equipmentId.replace(/'/g, "''")
    const result = await this.taskDataService.getAll({
      filter: `equipmentId eq '${sanitizedId}'`,
      orderBy: 'scheduledDate desc',
      top: 500,
    })
    return result.data
  }

  /**
   * Create a PM task from a template. Copies template checklist items
   * into task items with Pending status.
   */
  async createTaskFromTemplate(
    templateId: string,
    scheduledDate?: string,
  ): Promise<PMTask> {
    const template = await this.templateDataService.getById(templateId)
    const templateItems = await this.getTemplateItems(templateId)

    const taskData: Partial<PMTask> = {
      pmTemplateId: templateId,
      equipmentId: template.equipmentId,
      scheduledDate: scheduledDate ?? today(),
      completedDate: null,
      completedByPersonId: null,
      status: PMStatus.Scheduled,
      notes: '',
      generatedIssueId: null,
    }

    const errors = validatePMTask(taskData)
    if (errors.length > 0) throw errors[0]

    const task = await this.taskDataService.create(taskData)

    // Create task items from template items
    for (const ti of templateItems) {
      await this.taskItemDataService.create({
        pmTaskId: task.pmTaskId,
        pmTemplateItemId: ti.pmTemplateItemId,
        description: ti.description,
        status: PMChecklistItemStatus.Pending,
        notes: '',
        sortOrder: ti.sortOrder,
      })
    }

    return task
  }

  // ── PM Task Items ───────────────────────────────────────────────────────

  /** Get checklist items for a task, sorted by sortOrder. */
  async getTaskItems(taskId: string): Promise<PMTaskItem[]> {
    const sanitizedId = taskId.replace(/'/g, "''")
    const result = await this.taskItemDataService.getAll({
      filter: `pmTaskId eq '${sanitizedId}'`,
      orderBy: 'sortOrder asc',
      top: 500,
    })
    return result.data
  }

  /** Update a task item (e.g., mark Pass/Fail). */
  async updateTaskItem(
    id: string,
    updates: Partial<PMTaskItem>,
  ): Promise<PMTaskItem> {
    return this.taskItemDataService.update(id, updates)
  }

  // ── PM Completion ───────────────────────────────────────────────────────

  /**
   * Complete a PM task:
   * 1. Sets status to Completed with completedDate and completedByPersonId.
   * 2. If any checklist items have Fail status, auto-generates an issue.
   * 3. Automatically creates the next PM task based on the template frequency.
   *
   * Returns the completed task and optionally the generated issue and next task.
   */
  async completeTask(
    taskId: string,
    completedByPersonId: string,
  ): Promise<{
    task: PMTask
    generatedIssue: EquipmentIssue | null
    nextTask: PMTask | null
  }> {
    const task = await this.taskDataService.getById(taskId)
    const taskItems = await this.getTaskItems(taskId)
    const template = await this.templateDataService.getById(task.pmTemplateId)

    // Check for failed items
    const failedItems = taskItems.filter(
      (item) => item.status === PMChecklistItemStatus.Fail,
    )

    let generatedIssue: EquipmentIssue | null = null

    // Auto-generate issue for failed items
    if (failedItems.length > 0) {
      const failDescriptions = failedItems
        .map((item) => `- ${item.description}${item.notes ? ': ' + item.notes : ''}`)
        .join('\n')

      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 7)

      generatedIssue = await this.issueDataService.create({
        equipmentId: task.equipmentId,
        title: `PM Failed Items: ${template.name}`,
        description: `The following items failed during preventative maintenance:\n${failDescriptions}`,
        reportedByPersonId: completedByPersonId,
        assignedToPersonId: null,
        status: IssueStatus.Open,
        priority: IssuePriority.Medium,
        dueDate: dueDate.toISOString().slice(0, 10),
        createdOn: today(),
        resolvedOn: null,
        active: true,
      } as Partial<EquipmentIssue>)
    }

    // Update the task as completed
    const updates: Partial<PMTask> = {
      status: PMStatus.Completed,
      completedDate: today(),
      completedByPersonId,
      generatedIssueId: generatedIssue?.issueId ?? null,
    }

    const completedTask = await this.taskDataService.update(taskId, updates)

    // Auto-create next PM task
    let nextTask: PMTask | null = null
    if (template.active) {
      const nextDate = computeNextPMDate(
        task.scheduledDate,
        template.frequency,
      )
      nextTask = await this.createTaskFromTemplate(task.pmTemplateId, nextDate)
    }

    return { task: completedTask, generatedIssue, nextTask }
  }
}
