import { useState, useCallback } from 'react'
import {
  Badge,
  Button,
  Field,
  Input,
  makeStyles,
  Select,
  Tab,
  TabList,
  Text,
  Textarea,
  Title3,
  tokens,
} from '@fluentui/react-components'
import type { SelectTabData, SelectTabEvent } from '@fluentui/react-components'
import { useNavigate, useParams } from 'react-router-dom'
import { CorrectiveActionStatus, EquipmentStatus, IssuePriority, IssueStatus } from '../types'
import type { CorrectiveAction, Equipment, EquipmentIssue, IssueNote, Person } from '../types'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import { useServices } from '../contexts/ServiceContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { useAuth } from '../contexts/AuthContext'

const priorityColorMap: Record<IssuePriority, 'danger' | 'warning' | 'important' | 'success'> = {
  [IssuePriority.Critical]: 'danger',
  [IssuePriority.High]: 'important',
  [IssuePriority.Medium]: 'warning',
  [IssuePriority.Low]: 'success',
}

const statusColorMap: Record<
  IssueStatus,
  'success' | 'brand' | 'warning' | 'subtle' | 'informative'
> = {
  [IssueStatus.Open]: 'informative',
  [IssueStatus.InProgress]: 'brand',
  [IssueStatus.AwaitingParts]: 'warning',
  [IssueStatus.Resolved]: 'success',
  [IssueStatus.Closed]: 'subtle',
}

const statusLabelMap: Record<IssueStatus, string> = {
  [IssueStatus.Open]: 'Open',
  [IssueStatus.InProgress]: 'In Progress',
  [IssueStatus.AwaitingParts]: 'Awaiting Parts',
  [IssueStatus.Resolved]: 'Resolved',
  [IssueStatus.Closed]: 'Closed',
}

const actionStatusLabelMap: Record<CorrectiveActionStatus, string> = {
  [CorrectiveActionStatus.Planned]: 'Planned',
  [CorrectiveActionStatus.InProgress]: 'In Progress',
  [CorrectiveActionStatus.Completed]: 'Completed',
  [CorrectiveActionStatus.Verified]: 'Verified',
}

const actionStatusColorMap: Record<
  CorrectiveActionStatus,
  'success' | 'brand' | 'warning' | 'informative'
> = {
  [CorrectiveActionStatus.Planned]: 'informative',
  [CorrectiveActionStatus.InProgress]: 'brand',
  [CorrectiveActionStatus.Completed]: 'success',
  [CorrectiveActionStatus.Verified]: 'success',
}

function getPersonName(personId: string | null, persons: Person[]): string {
  if (!personId) return 'Unassigned'
  const person = persons.find((p) => p.personId === personId)
  return person?.displayName ?? 'Unknown'
}

function getEquipmentDisplay(equipmentId: string, equipment: Equipment[]): string {
  const equip = equipment.find((e) => e.equipmentId === equipmentId)
  return equip ? `${equip.name} (${equip.equipmentCode})` : 'Unknown Equipment'
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function nowISO(): string {
  return new Date().toISOString()
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
  tabContent: {
    paddingTop: tokens.spacingVerticalL,
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '160px 1fr',
    gap: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    maxWidth: '600px',
  },
  label: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
  },
  editRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalM,
  },
  errorText: {
    color: tokens.colorPaletteRedForeground1,
  },
  notesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  noteItem: {
    padding: tokens.spacingVerticalS,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    borderLeft: `3px solid ${tokens.colorBrandStroke1}`,
    paddingLeft: tokens.spacingHorizontalM,
  },
  noteMeta: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalXS,
  },
  noteForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    maxWidth: '600px',
    paddingTop: tokens.spacingVerticalM,
  },
  actionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  actionItem: {
    display: 'grid',
    gridTemplateColumns: '1fr auto auto',
    gap: tokens.spacingHorizontalM,
    alignItems: 'center',
    padding: tokens.spacingVerticalS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  actionForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    maxWidth: '600px',
    paddingTop: tokens.spacingVerticalM,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    marginTop: tokens.spacingVerticalM,
  },
  emptyState: {
    color: tokens.colorNeutralForeground3,
    fontStyle: 'italic',
    padding: tokens.spacingVerticalM,
  },
})

type TabValue = 'details' | 'notes' | 'actions'

export default function IssueDetailPage() {
  const styles = useStyles()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const {
    equipmentIssueService,
    issueNoteService,
    correctiveActionService,
    equipmentService,
    personService,
  } = useServices()

  const [selectedTab, setSelectedTab] = useState<TabValue>('details')

  // Inline edit state
  const [editing, setEditing] = useState(false)
  const [editStatus, setEditStatus] = useState<IssueStatus>(IssueStatus.Open)
  const [editPriority, setEditPriority] = useState<IssuePriority>(IssuePriority.Medium)
  const [editAssignedTo, setEditAssignedTo] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Note form state
  const [noteContent, setNoteContent] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  // Corrective action form state
  const [showActionForm, setShowActionForm] = useState(false)
  const [actionDescription, setActionDescription] = useState('')
  const [actionAssignedTo, setActionAssignedTo] = useState('')
  const [addingAction, setAddingAction] = useState(false)

  // Complete action state
  const [completingActionId, setCompletingActionId] = useState<string | null>(null)
  const [completeEquipmentStatus, setCompleteEquipmentStatus] = useState('')

  const fetcher = useCallback(async () => {
    if (!id) throw new Error('Invalid URL')
    const [issue, equipment, persons, notes, actions] = await Promise.all([
      equipmentIssueService.getById(id),
      equipmentService.getAll({ top: 5000 }),
      personService.getAll({ top: 500 }),
      issueNoteService.getAll({ top: 500, filter: `issueId eq '${id}'` }),
      correctiveActionService.getAll({ top: 500, filter: `issueId eq '${id}'` }),
    ])
    return {
      issue,
      equipment: equipment.data,
      persons: persons.data,
      notes: notes.data,
      actions: actions.data,
    }
  }, [
    id,
    equipmentIssueService,
    equipmentService,
    personService,
    issueNoteService,
    correctiveActionService,
  ])

  const { data, loading, error, reload } = useAsyncData(fetcher, [id])

  if (!id) return <Text>Invalid URL</Text>
  if (loading) return <LoadingState />
  if (error || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <Button appearance="subtle" onClick={() => void navigate('/issues')}>
            Back
          </Button>
          <Title3 as="h1">Issue Not Found</Title3>
        </div>
        <ErrorState message={error ?? 'Issue not found'} onRetry={reload} />
      </div>
    )
  }

  const { issue, equipment, persons, notes, actions } = data

  const handleTabSelect = (_event: SelectTabEvent, tabData: SelectTabData) => {
    setSelectedTab(tabData.value as TabValue)
  }

  const handleBack = () => {
    void navigate('/issues')
  }

  // --- Details inline editing ---
  const startEdit = () => {
    setEditStatus(issue.status)
    setEditPriority(issue.priority)
    setEditAssignedTo(issue.assignedToPersonId ?? '')
    setSaveError(null)
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setSaveError(null)
  }

  const handleDetailsSave = async () => {
    if (saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const patch: Partial<EquipmentIssue> = {
        status: editStatus,
        priority: editPriority,
        assignedToPersonId: editAssignedTo || null,
      }
      // Auto-set resolvedOn when status becomes Resolved or Closed
      if (
        (editStatus === IssueStatus.Resolved || editStatus === IssueStatus.Closed) &&
        issue.status !== IssueStatus.Resolved &&
        issue.status !== IssueStatus.Closed
      ) {
        patch.resolvedOn = todayISO()
      }
      await equipmentIssueService.update(id, patch)
      setEditing(false)
      reload()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // --- Notes ---
  const handleAddNote = async () => {
    if (addingNote || !noteContent.trim()) return
    setAddingNote(true)
    try {
      await issueNoteService.create({
        issueId: id,
        authorPersonId: user?.person?.personId ?? '',
        content: noteContent.trim(),
        createdOn: nowISO(),
      } as Partial<IssueNote>)
      setNoteContent('')
      reload()
    } catch {
      // Silently fail — user can retry
    } finally {
      setAddingNote(false)
    }
  }

  // --- Corrective Actions ---
  const handleAddAction = async () => {
    if (addingAction || !actionDescription.trim()) return
    setAddingAction(true)
    try {
      await correctiveActionService.create({
        issueId: id,
        description: actionDescription.trim(),
        assignedToPersonId: actionAssignedTo || '',
        status: CorrectiveActionStatus.Planned,
        equipmentStatusChange: null,
        completedOn: null,
        createdOn: nowISO(),
      } as Partial<CorrectiveAction>)
      setActionDescription('')
      setActionAssignedTo('')
      setShowActionForm(false)
      reload()
    } catch {
      // Silently fail
    } finally {
      setAddingAction(false)
    }
  }

  const handleCompleteAction = async (actionId: string) => {
    try {
      const patch: Partial<CorrectiveAction> = {
        status: CorrectiveActionStatus.Completed,
        completedOn: todayISO(),
        equipmentStatusChange: completeEquipmentStatus
          ? (completeEquipmentStatus as EquipmentStatus)
          : null,
      }
      await correctiveActionService.update(actionId, patch)
      setCompletingActionId(null)
      setCompleteEquipmentStatus('')
      reload()
    } catch {
      // Silently fail
    }
  }

  const sortedNotes = [...notes].sort(
    (a, b) => new Date(a.createdOn).getTime() - new Date(b.createdOn).getTime(),
  )

  const renderDetailsTab = () => (
    <>
      {!editing && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: tokens.spacingVerticalM,
          }}
        >
          <Button appearance="primary" onClick={startEdit}>
            Edit
          </Button>
        </div>
      )}
      {editing ? (
        <div style={{ maxWidth: '600px' }}>
          {saveError && <Text className={styles.errorText}>{saveError}</Text>}
          <div className={styles.infoGrid}>
            <Text className={styles.label}>Equipment</Text>
            <Text>{getEquipmentDisplay(issue.equipmentId, equipment)}</Text>
            <Text className={styles.label}>Title</Text>
            <Text>{issue.title}</Text>
            <Text className={styles.label}>Description</Text>
            <Text>{issue.description || 'No description.'}</Text>
            <Text className={styles.label}>Status</Text>
            <Select value={editStatus} onChange={(_, d) => setEditStatus(d.value as IssueStatus)}>
              <option value={IssueStatus.Open}>Open</option>
              <option value={IssueStatus.InProgress}>In Progress</option>
              <option value={IssueStatus.AwaitingParts}>Awaiting Parts</option>
              <option value={IssueStatus.Resolved}>Resolved</option>
              <option value={IssueStatus.Closed}>Closed</option>
            </Select>
            <Text className={styles.label}>Priority</Text>
            <Select
              value={editPriority}
              onChange={(_, d) => setEditPriority(d.value as IssuePriority)}
            >
              <option value={IssuePriority.Low}>Low</option>
              <option value={IssuePriority.Medium}>Medium</option>
              <option value={IssuePriority.High}>High</option>
              <option value={IssuePriority.Critical}>Critical</option>
            </Select>
            <Text className={styles.label}>Assigned To</Text>
            <Select value={editAssignedTo} onChange={(_, d) => setEditAssignedTo(d.value)}>
              <option value="">-- Unassigned --</option>
              {persons
                .filter((p) => p.active)
                .map((p) => (
                  <option key={p.personId} value={p.personId}>
                    {p.displayName}
                  </option>
                ))}
            </Select>
          </div>
          <div className={styles.editRow}>
            <Button appearance="primary" onClick={() => void handleDetailsSave()} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button onClick={cancelEdit} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.infoGrid}>
          <Text className={styles.label}>Equipment</Text>
          <Text>{getEquipmentDisplay(issue.equipmentId, equipment)}</Text>
          <Text className={styles.label}>Title</Text>
          <Text>{issue.title}</Text>
          <Text className={styles.label}>Description</Text>
          <Text>{issue.description || 'No description.'}</Text>
          <Text className={styles.label}>Priority</Text>
          <Badge appearance="filled" color={priorityColorMap[issue.priority]}>
            {issue.priority}
          </Badge>
          <Text className={styles.label}>Status</Text>
          <Badge appearance="filled" color={statusColorMap[issue.status]}>
            {statusLabelMap[issue.status]}
          </Badge>
          <Text className={styles.label}>Due Date</Text>
          <Text>{issue.dueDate}</Text>
          <Text className={styles.label}>Reported By</Text>
          <Text>{getPersonName(issue.reportedByPersonId, persons)}</Text>
          <Text className={styles.label}>Assigned To</Text>
          <Text>{getPersonName(issue.assignedToPersonId, persons)}</Text>
          <Text className={styles.label}>Created On</Text>
          <Text>{issue.createdOn}</Text>
          {issue.resolvedOn && (
            <>
              <Text className={styles.label}>Resolved On</Text>
              <Text>{issue.resolvedOn}</Text>
            </>
          )}
        </div>
      )}
    </>
  )

  const renderNotesTab = () => (
    <>
      {sortedNotes.length === 0 ? (
        <Text className={styles.emptyState}>No notes yet.</Text>
      ) : (
        <div className={styles.notesList}>
          {sortedNotes.map((note) => (
            <div key={note.issueNoteId} className={styles.noteItem}>
              <div className={styles.noteMeta}>
                <Text size={200} weight="semibold">
                  {getPersonName(note.authorPersonId, persons)}
                </Text>
                <Text size={200}>{note.createdOn}</Text>
              </div>
              <Text>{note.content}</Text>
            </div>
          ))}
        </div>
      )}
      <div className={styles.noteForm}>
        <Field label="Add a note">
          <Textarea
            value={noteContent}
            onChange={(_, d) => setNoteContent(d.value)}
            placeholder="Write a note..."
          />
        </Field>
        <Button
          appearance="primary"
          onClick={() => void handleAddNote()}
          disabled={addingNote || !noteContent.trim()}
        >
          {addingNote ? 'Adding...' : 'Add Note'}
        </Button>
      </div>
    </>
  )

  const renderActionsTab = () => (
    <>
      {actions.length === 0 ? (
        <Text className={styles.emptyState}>No corrective actions yet.</Text>
      ) : (
        <div className={styles.actionsList}>
          {actions.map((action) => (
            <div key={action.correctiveActionId}>
              <div className={styles.actionItem}>
                <div>
                  <Text weight="semibold">{action.description}</Text>
                  <br />
                  <Text size={200}>
                    Assigned to: {getPersonName(action.assignedToPersonId, persons)}
                  </Text>
                </div>
                <Badge appearance="filled" color={actionStatusColorMap[action.status]}>
                  {actionStatusLabelMap[action.status]}
                </Badge>
                {action.status !== CorrectiveActionStatus.Completed &&
                  action.status !== CorrectiveActionStatus.Verified && (
                    <Button
                      size="small"
                      onClick={() => setCompletingActionId(action.correctiveActionId)}
                    >
                      Complete
                    </Button>
                  )}
              </div>
              {completingActionId === action.correctiveActionId && (
                <div
                  style={{
                    padding: tokens.spacingVerticalS,
                    display: 'flex',
                    gap: tokens.spacingHorizontalM,
                    alignItems: 'flex-end',
                  }}
                >
                  <Field label="Change equipment status (optional)">
                    <Select
                      value={completeEquipmentStatus}
                      onChange={(_, d) => setCompleteEquipmentStatus(d.value)}
                    >
                      <option value="">-- No change --</option>
                      <option value={EquipmentStatus.Available}>Available</option>
                      <option value={EquipmentStatus.InUse}>In Use</option>
                      <option value={EquipmentStatus.UnderMaintenance}>Under Maintenance</option>
                      <option value={EquipmentStatus.Retired}>Retired</option>
                    </Select>
                  </Field>
                  <Button
                    appearance="primary"
                    size="small"
                    onClick={() => void handleCompleteAction(action.correctiveActionId)}
                  >
                    Confirm
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      setCompletingActionId(null)
                      setCompleteEquipmentStatus('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!showActionForm ? (
        <div style={{ paddingTop: tokens.spacingVerticalM }}>
          <Button appearance="primary" onClick={() => setShowActionForm(true)}>
            Add Action
          </Button>
        </div>
      ) : (
        <div className={styles.actionForm}>
          <Field label="Description" required>
            <Input
              value={actionDescription}
              onChange={(_, d) => setActionDescription(d.value)}
              placeholder="Describe the corrective action..."
            />
          </Field>
          <Field label="Assigned To">
            <Select value={actionAssignedTo} onChange={(_, d) => setActionAssignedTo(d.value)}>
              <option value="">-- Select person --</option>
              {persons
                .filter((p) => p.active)
                .map((p) => (
                  <option key={p.personId} value={p.personId}>
                    {p.displayName}
                  </option>
                ))}
            </Select>
          </Field>
          <div style={{ display: 'flex', gap: tokens.spacingHorizontalM }}>
            <Button
              appearance="primary"
              onClick={() => void handleAddAction()}
              disabled={addingAction || !actionDescription.trim()}
            >
              {addingAction ? 'Adding...' : 'Add Action'}
            </Button>
            <Button onClick={() => setShowActionForm(false)} disabled={addingAction}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </>
  )

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'details':
        return renderDetailsTab()
      case 'notes':
        return renderNotesTab()
      case 'actions':
        return renderActionsTab()
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button appearance="subtle" onClick={handleBack}>
          Back
        </Button>
      </div>

      <div className={styles.titleRow}>
        <Title3 as="h1">{issue.title}</Title3>
        <Badge appearance="filled" color={priorityColorMap[issue.priority]}>
          {issue.priority}
        </Badge>
        <Badge appearance="filled" color={statusColorMap[issue.status]}>
          {statusLabelMap[issue.status]}
        </Badge>
      </div>

      <TabList selectedValue={selectedTab} onTabSelect={handleTabSelect}>
        <Tab value="details">Details</Tab>
        <Tab value="notes">Notes</Tab>
        <Tab value="actions">Corrective Actions</Tab>
      </TabList>

      <div className={styles.tabContent}>{renderTabContent()}</div>
    </div>
  )
}
