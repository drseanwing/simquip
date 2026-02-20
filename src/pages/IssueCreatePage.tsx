import { useState, useMemo } from 'react'
import {
  Button,
  Field,
  Input,
  makeStyles,
  Select,
  Text,
  Textarea,
  Title2,
  tokens,
} from '@fluentui/react-components'
import { useNavigate } from 'react-router-dom'
import { IssuePriority, IssueStatus } from '../types'
import type { EquipmentIssue } from '../types'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import { useServices } from '../contexts/ServiceContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { useAuth } from '../contexts/AuthContext'

function defaultDueDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

function nowISO(): string {
  return new Date().toISOString()
}

const useStyles = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    maxWidth: '640px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
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

function getFieldError(
  errors: Array<{ field?: string; message: string }>,
  fieldName: string,
): string | undefined {
  return errors.find((e) => e.field === fieldName)?.message
}

export default function IssueCreatePage() {
  const styles = useStyles()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { equipmentIssueService, equipmentService, personService } = useServices()

  const {
    data: refData,
    loading,
    error,
    reload,
  } = useAsyncData(async () => {
    const [equipment, persons] = await Promise.all([
      equipmentService.getAll({ top: 5000 }),
      personService.getAll({ top: 500 }),
    ])
    return { equipment: equipment.data, persons: persons.data }
  }, [])

  const [equipmentId, setEquipmentId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<IssuePriority>(IssuePriority.Medium)
  const [dueDate, setDueDate] = useState(defaultDueDate)
  const [assignedToPersonId, setAssignedToPersonId] = useState('')
  const [errors, setErrors] = useState<Array<{ field?: string; message: string }>>([])
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const activeEquipment = useMemo(() => refData?.equipment.filter((e) => e.active) ?? [], [refData])
  const activePersons = useMemo(() => refData?.persons.filter((p) => p.active) ?? [], [refData])

  if (loading) return <LoadingState />
  if (error || !refData) return <ErrorState message={error ?? 'Failed to load'} onRetry={reload} />

  const validate = (): Array<{ field?: string; message: string }> => {
    const result: Array<{ field?: string; message: string }> = []
    if (!equipmentId) result.push({ field: 'equipmentId', message: 'Equipment is required.' })
    if (!title.trim()) result.push({ field: 'title', message: 'Title is required.' })
    return result
  }

  const handleSave = async () => {
    if (saving) return

    const validationErrors = validate()
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    setSaving(true)
    setErrors([])
    try {
      const newIssue = await equipmentIssueService.create({
        equipmentId,
        title: title.trim(),
        description: description.trim(),
        reportedByPersonId: user?.person?.personId ?? '',
        assignedToPersonId: assignedToPersonId || null,
        status: IssueStatus.Open,
        priority,
        dueDate: dueDate || defaultDueDate(),
        createdOn: nowISO(),
        resolvedOn: null,
        active: true,
      } as Partial<EquipmentIssue>)
      setShowSuccess(true)
      setTimeout(() => {
        void navigate(`/issues/${newIssue.issueId}`)
      }, 1000)
    } catch (err: unknown) {
      setErrors([{ message: err instanceof Error ? err.message : 'Save failed' }])
      setSaving(false)
    }
  }

  const handleCancel = () => {
    void navigate('/issues')
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button appearance="subtle" onClick={handleCancel} disabled={saving}>
          Back
        </Button>
        <Title2 as="h1">Report Issue</Title2>
      </div>

      {showSuccess && <Text className={styles.successMessage}>Issue created successfully!</Text>}
      {errors
        .filter((e) => !e.field)
        .map((e, i) => (
          <Text key={i} className={styles.errorText}>
            {e.message}
          </Text>
        ))}

      <div className={styles.form}>
        <Field
          label="Equipment"
          required
          validationMessage={getFieldError(errors, 'equipmentId')}
          validationState={getFieldError(errors, 'equipmentId') ? 'error' : 'none'}
        >
          <Select value={equipmentId} onChange={(_e, data) => setEquipmentId(data.value)}>
            <option value="">-- Select equipment --</option>
            {activeEquipment.map((equip) => (
              <option key={equip.equipmentId} value={equip.equipmentId}>
                {equip.name} ({equip.equipmentCode})
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Title"
          required
          validationMessage={getFieldError(errors, 'title')}
          validationState={getFieldError(errors, 'title') ? 'error' : 'none'}
        >
          <Input
            value={title}
            onChange={(_, d) => setTitle(d.value)}
            placeholder="Brief summary of the issue..."
          />
        </Field>

        <Field label="Description">
          <Textarea
            value={description}
            onChange={(_, d) => setDescription(d.value)}
            placeholder="Detailed description of the issue..."
          />
        </Field>

        <Field label="Priority">
          <Select
            value={priority}
            onChange={(_e, data) => setPriority(data.value as IssuePriority)}
          >
            <option value={IssuePriority.Low}>Low</option>
            <option value={IssuePriority.Medium}>Medium</option>
            <option value={IssuePriority.High}>High</option>
            <option value={IssuePriority.Critical}>Critical</option>
          </Select>
        </Field>

        <Field label="Due Date">
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>

        <Field label="Assigned To">
          <Select
            value={assignedToPersonId}
            onChange={(_e, data) => setAssignedToPersonId(data.value)}
          >
            <option value="">-- Unassigned --</option>
            {activePersons.map((person) => (
              <option key={person.personId} value={person.personId}>
                {person.displayName}
              </option>
            ))}
          </Select>
        </Field>

        <div className={styles.actions}>
          <Button appearance="primary" onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Creating...' : 'Create Issue'}
          </Button>
          <Button appearance="secondary" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
