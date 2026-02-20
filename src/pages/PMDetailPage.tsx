import { useState, useCallback } from 'react'
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Text,
  Textarea,
  Title3,
  tokens,
} from '@fluentui/react-components'
import { useNavigate, useParams } from 'react-router-dom'
import type { PMTask, PMTaskItem, EquipmentIssue } from '../types'
import { PMStatus, PMChecklistItemStatus, IssueStatus, IssuePriority } from '../types'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import { useServices } from '../contexts/ServiceContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { useAuth } from '../contexts/AuthContext'
import { computeNextPMDate } from '../utils/dateUtils'

const statusColorMap: Record<
  PMStatus,
  'informative' | 'warning' | 'success' | 'danger' | 'subtle'
> = {
  [PMStatus.Scheduled]: 'informative',
  [PMStatus.InProgress]: 'warning',
  [PMStatus.Completed]: 'success',
  [PMStatus.Overdue]: 'danger',
  [PMStatus.Cancelled]: 'subtle',
}

const statusLabelMap: Record<PMStatus, string> = {
  [PMStatus.Scheduled]: 'Scheduled',
  [PMStatus.InProgress]: 'In Progress',
  [PMStatus.Completed]: 'Completed',
  [PMStatus.Overdue]: 'Overdue',
  [PMStatus.Cancelled]: 'Cancelled',
}

function defaultDueDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

const useStyles = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '160px 1fr',
    gap: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    alignContent: 'start',
  },
  label: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  checklistItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    padding: tokens.spacingVerticalS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  checklistRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
  },
  checklistDescription: {
    flexGrow: 1,
    minWidth: '200px',
  },
  notesInput: {
    maxWidth: '400px',
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalM,
  },
  errorText: {
    color: tokens.colorPaletteRedForeground1,
  },
  successMessage: {
    color: tokens.colorPaletteGreenForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
})

type ItemStatusUpdate = { status: PMChecklistItemStatus; notes: string }

export default function PMDetailPage() {
  const styles = useStyles()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const {
    pmTaskService,
    pmTaskItemService,
    pmTemplateService,
    pmTemplateItemService,
    equipmentService,
    equipmentIssueService,
  } = useServices()

  const [itemUpdates, setItemUpdates] = useState<Record<string, ItemStatusUpdate>>({})
  const [generalNotes, setGeneralNotes] = useState('')
  const [notesInitialized, setNotesInitialized] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [completionInfo, setCompletionInfo] = useState<string | null>(null)

  const fetcher = useCallback(async () => {
    if (!id) throw new Error('Invalid URL')
    const [task, templates, equipment] = await Promise.all([
      pmTaskService.getById(id),
      pmTemplateService.getAll({ top: 5000 }),
      equipmentService.getAll({ top: 5000 }),
    ])
    const [taskItems, templateItems] = await Promise.all([
      pmTaskItemService.getAll({ top: 500, filter: `pmTaskId eq '${id}'` }),
      pmTemplateItemService.getAll({
        top: 500,
        filter: `pmTemplateId eq '${task.pmTemplateId}'`,
      }),
    ])
    const template = templates.data.find((t) => t.pmTemplateId === task.pmTemplateId) ?? null
    const equip = equipment.data.find((e) => e.equipmentId === task.equipmentId) ?? null
    return {
      task,
      taskItems: taskItems.data.sort((a, b) => a.sortOrder - b.sortOrder),
      template,
      templateItems: templateItems.data,
      equipment: equip,
    }
  }, [
    id,
    pmTaskService,
    pmTaskItemService,
    pmTemplateService,
    pmTemplateItemService,
    equipmentService,
  ])

  const { data, loading, error, reload } = useAsyncData(fetcher, [id])

  // Initialize notes from task data once loaded
  if (data && !notesInitialized) {
    setGeneralNotes(data.task.notes ?? '')
    const updates: Record<string, ItemStatusUpdate> = {}
    for (const item of data.taskItems) {
      updates[item.pmTaskItemId] = { status: item.status, notes: item.notes }
    }
    setItemUpdates(updates)
    setNotesInitialized(true)
  }

  if (!id) return <Text>Invalid URL</Text>
  if (loading) return <LoadingState />
  if (error || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <Button appearance="subtle" onClick={() => void navigate('/maintenance')}>
            Back
          </Button>
          <Title3 as="h1">Task Not Found</Title3>
        </div>
        <ErrorState message={error ?? 'Task not found'} onRetry={reload} />
      </div>
    )
  }

  const { task, taskItems, template, equipment } = data
  const isCompleted = task.status === PMStatus.Completed || task.status === PMStatus.Cancelled

  const getItemStatus = (itemId: string): PMChecklistItemStatus =>
    itemUpdates[itemId]?.status ?? PMChecklistItemStatus.Pending

  const getItemNotes = (itemId: string): string => itemUpdates[itemId]?.notes ?? ''

  const setItemStatus = (itemId: string, status: PMChecklistItemStatus) => {
    setItemUpdates((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], status, notes: prev[itemId]?.notes ?? '' },
    }))
  }

  const setItemNotes = (itemId: string, notes: string) => {
    setItemUpdates((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        notes,
        status: prev[itemId]?.status ?? PMChecklistItemStatus.Pending,
      },
    }))
  }

  const hasFailedItems = (): boolean =>
    Object.values(itemUpdates).some((u) => u.status === PMChecklistItemStatus.Fail)

  const handleCompleteClick = () => {
    if (hasFailedItems()) {
      setConfirmDialogOpen(true)
    } else {
      void performComplete()
    }
  }

  const handleConfirmComplete = () => {
    setConfirmDialogOpen(false)
    void performComplete()
  }

  const performComplete = async () => {
    if (saving) return
    setSaving(true)
    setSaveError(null)
    setCompletionInfo(null)

    try {
      // Update each task item
      for (const item of taskItems) {
        const update = itemUpdates[item.pmTaskItemId]
        if (update) {
          await pmTaskItemService.update(item.pmTaskItemId, {
            status: update.status,
            notes: update.notes,
          } as Partial<PMTaskItem>)
        }
      }

      // Update the task itself
      await pmTaskService.update(task.pmTaskId, {
        status: PMStatus.Completed,
        completedDate: todayISO(),
        completedByPersonId: user?.person?.personId ?? null,
        notes: generalNotes,
      } as Partial<PMTask>)

      // If failed items, create an issue
      let generatedIssueId: string | null = null
      if (hasFailedItems()) {
        const failedDescriptions = taskItems
          .filter((item) => itemUpdates[item.pmTaskItemId]?.status === PMChecklistItemStatus.Fail)
          .map((item) => {
            const notes = itemUpdates[item.pmTaskItemId]?.notes
            return notes ? `${item.description}: ${notes}` : item.description
          })
          .join('; ')

        const issue = await equipmentIssueService.create({
          equipmentId: task.equipmentId,
          title: `PM Failed Items - ${template?.name ?? 'Maintenance'}`,
          description: `Failed checklist items during PM task (${task.scheduledDate}): ${failedDescriptions}`,
          reportedByPersonId: user?.person?.personId ?? '',
          assignedToPersonId: null,
          status: IssueStatus.Open,
          priority: IssuePriority.Medium,
          dueDate: defaultDueDate(),
          createdOn: new Date().toISOString(),
          resolvedOn: null,
          active: true,
        } as Partial<EquipmentIssue>)
        generatedIssueId = issue.issueId

        // Link the issue to the task
        await pmTaskService.update(task.pmTaskId, {
          generatedIssueId: issue.issueId,
        } as Partial<PMTask>)
      }

      // Auto-create next PM task from template
      let nextInfo = ''
      if (template) {
        const nextDate = computeNextPMDate(task.scheduledDate, template.frequency)
        const nextTask = await pmTaskService.create({
          pmTemplateId: template.pmTemplateId,
          equipmentId: task.equipmentId,
          scheduledDate: nextDate,
          completedDate: null,
          completedByPersonId: null,
          status: PMStatus.Scheduled,
          notes: '',
          generatedIssueId: null,
        } as Partial<PMTask>)

        // Create task items from template items
        const tmplItems = data.templateItems
        for (const tmplItem of tmplItems) {
          await pmTaskItemService.create({
            pmTaskId: nextTask.pmTaskId,
            pmTemplateItemId: tmplItem.pmTemplateItemId,
            description: tmplItem.description,
            status: PMChecklistItemStatus.Pending,
            notes: '',
            sortOrder: tmplItem.sortOrder,
          } as Partial<PMTaskItem>)
        }
        nextInfo = `Next PM scheduled for ${nextDate}.`
      }

      const issueInfo = generatedIssueId ? ' An issue has been created for failed items.' : ''
      setCompletionInfo(`PM completed successfully.${issueInfo} ${nextInfo}`.trim())
      reload()
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to complete PM task')
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    void navigate('/maintenance')
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button appearance="subtle" onClick={handleBack}>
          Back
        </Button>
      </div>

      <div className={styles.titleRow}>
        <Title3 as="h1">{equipment?.name ?? 'Unknown Equipment'}</Title3>
        <Text>— {template?.name ?? 'Unknown Template'}</Text>
        <Badge appearance="filled" color={statusColorMap[task.status]}>
          {statusLabelMap[task.status]}
        </Badge>
      </div>

      <div className={styles.infoGrid}>
        <Text className={styles.label}>Equipment</Text>
        <Text>{equipment ? `${equipment.name} (${equipment.equipmentCode})` : 'Unknown'}</Text>
        <Text className={styles.label}>Template</Text>
        <Text>{template?.name ?? 'Unknown'}</Text>
        <Text className={styles.label}>Scheduled Date</Text>
        <Text>{task.scheduledDate}</Text>
        <Text className={styles.label}>Completed Date</Text>
        <Text>{task.completedDate ?? '—'}</Text>
        <Text className={styles.label}>Status</Text>
        <Text>{statusLabelMap[task.status]}</Text>
      </div>

      {completionInfo && (
        <MessageBar intent="success">
          <MessageBarBody>{completionInfo}</MessageBarBody>
        </MessageBar>
      )}
      {saveError && (
        <MessageBar intent="error">
          <MessageBarBody>{saveError}</MessageBarBody>
        </MessageBar>
      )}

      {/* Checklist Section */}
      <div className={styles.section}>
        <Text size={500} weight="semibold">
          Checklist
        </Text>
        {taskItems.length === 0 ? (
          <Text>No checklist items.</Text>
        ) : (
          taskItems.map((item) => (
            <div key={item.pmTaskItemId} className={styles.checklistItem}>
              <div className={styles.checklistRow}>
                <Text className={styles.checklistDescription} weight="semibold">
                  {item.sortOrder}. {item.description}
                </Text>
                <Checkbox
                  label="Pass"
                  checked={getItemStatus(item.pmTaskItemId) === PMChecklistItemStatus.Pass}
                  onChange={() => setItemStatus(item.pmTaskItemId, PMChecklistItemStatus.Pass)}
                  disabled={isCompleted}
                />
                <Checkbox
                  label="Fail"
                  checked={getItemStatus(item.pmTaskItemId) === PMChecklistItemStatus.Fail}
                  onChange={() => setItemStatus(item.pmTaskItemId, PMChecklistItemStatus.Fail)}
                  disabled={isCompleted}
                />
                <Checkbox
                  label="N/A"
                  checked={getItemStatus(item.pmTaskItemId) === PMChecklistItemStatus.NotApplicable}
                  onChange={() =>
                    setItemStatus(item.pmTaskItemId, PMChecklistItemStatus.NotApplicable)
                  }
                  disabled={isCompleted}
                />
              </div>
              <Input
                className={styles.notesInput}
                placeholder="Notes..."
                value={getItemNotes(item.pmTaskItemId)}
                onChange={(_, d) => setItemNotes(item.pmTaskItemId, d.value)}
                disabled={isCompleted}
              />
            </div>
          ))
        )}
      </div>

      {/* Notes Section */}
      <div className={styles.section}>
        <Field label="General Notes">
          <Textarea
            value={generalNotes}
            onChange={(_, d) => setGeneralNotes(d.value)}
            placeholder="General PM notes..."
            disabled={isCompleted}
          />
        </Field>
      </div>

      {/* Actions */}
      {!isCompleted && (
        <div className={styles.actions}>
          <Button appearance="primary" onClick={handleCompleteClick} disabled={saving}>
            {saving ? 'Completing...' : 'Complete PM'}
          </Button>
        </div>
      )}

      {/* Confirmation Dialog for failed items */}
      <Dialog open={confirmDialogOpen} onOpenChange={(_, d) => setConfirmDialogOpen(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Confirm Completion</DialogTitle>
            <DialogContent>
              Some checklist items have failed. An equipment issue will be automatically created for
              the failed items. Do you want to proceed?
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setConfirmDialogOpen(false)}>
                Cancel
              </Button>
              <Button appearance="primary" onClick={handleConfirmComplete}>
                Complete & Create Issue
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  )
}
