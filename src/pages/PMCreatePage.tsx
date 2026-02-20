import { useState, useMemo, useCallback } from 'react'
import { Button, Field, makeStyles, Select, Text, Title2, tokens } from '@fluentui/react-components'
import { useNavigate } from 'react-router-dom'
import { PMStatus, PMChecklistItemStatus } from '../types'
import type { PMTask, PMTaskItem } from '../types'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import { useServices } from '../contexts/ServiceContext'
import { useAsyncData } from '../hooks/useAsyncData'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
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

export default function PMCreatePage() {
  const styles = useStyles()
  const navigate = useNavigate()
  const {
    equipmentService,
    pmTemplateService,
    pmTemplateItemService,
    pmTaskService,
    pmTaskItemService,
  } = useServices()

  const fetcher = useCallback(async () => {
    const [equipment, templates] = await Promise.all([
      equipmentService.getAll({ top: 5000 }),
      pmTemplateService.getAll({ top: 5000 }),
    ])
    return {
      equipment: equipment.data.filter((e) => e.active),
      templates: templates.data.filter((t) => t.active),
    }
  }, [equipmentService, pmTemplateService])

  const { data: refData, loading, error, reload } = useAsyncData(fetcher, [])

  const [equipmentId, setEquipmentId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [scheduledDate, setScheduledDate] = useState(todayISO)
  const [errors, setErrors] = useState<Array<{ field?: string; message: string }>>([])
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const filteredTemplates = useMemo(() => {
    if (!refData || !equipmentId) return []
    return refData.templates.filter((t) => t.equipmentId === equipmentId)
  }, [refData, equipmentId])

  if (loading) return <LoadingState />
  if (error || !refData) return <ErrorState message={error ?? 'Failed to load'} onRetry={reload} />

  const validate = (): Array<{ field?: string; message: string }> => {
    const result: Array<{ field?: string; message: string }> = []
    if (!equipmentId) result.push({ field: 'equipmentId', message: 'Equipment is required.' })
    if (!templateId) result.push({ field: 'templateId', message: 'Template is required.' })
    if (!scheduledDate)
      result.push({ field: 'scheduledDate', message: 'Scheduled date is required.' })
    return result
  }

  const handleEquipmentChange = (
    _e: React.ChangeEvent<HTMLSelectElement>,
    data: { value: string },
  ) => {
    setEquipmentId(data.value)
    setTemplateId('')
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
      // Create the PM task
      const newTask = await pmTaskService.create({
        pmTemplateId: templateId,
        equipmentId,
        scheduledDate,
        completedDate: null,
        completedByPersonId: null,
        status: PMStatus.Scheduled,
        notes: '',
        generatedIssueId: null,
      } as Partial<PMTask>)

      // Create task items from template items
      const templateItems = await pmTemplateItemService.getAll({
        top: 500,
        filter: `pmTemplateId eq '${templateId}'`,
      })
      for (const tmplItem of templateItems.data) {
        await pmTaskItemService.create({
          pmTaskId: newTask.pmTaskId,
          pmTemplateItemId: tmplItem.pmTemplateItemId,
          description: tmplItem.description,
          status: PMChecklistItemStatus.Pending,
          notes: '',
          sortOrder: tmplItem.sortOrder,
        } as Partial<PMTaskItem>)
      }

      setShowSuccess(true)
      setTimeout(() => {
        void navigate(`/maintenance/${newTask.pmTaskId}`)
      }, 1000)
    } catch (err: unknown) {
      setErrors([{ message: err instanceof Error ? err.message : 'Save failed' }])
      setSaving(false)
    }
  }

  const handleCancel = () => {
    void navigate('/maintenance')
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button appearance="subtle" onClick={handleCancel} disabled={saving}>
          Back
        </Button>
        <Title2 as="h1">Schedule PM</Title2>
      </div>

      {showSuccess && (
        <Text className={styles.successMessage}>PM task scheduled successfully!</Text>
      )}
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
          <Select value={equipmentId} onChange={handleEquipmentChange}>
            <option value="">-- Select equipment --</option>
            {refData.equipment.map((equip) => (
              <option key={equip.equipmentId} value={equip.equipmentId}>
                {equip.name} ({equip.equipmentCode})
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="PM Template"
          required
          validationMessage={getFieldError(errors, 'templateId')}
          validationState={getFieldError(errors, 'templateId') ? 'error' : 'none'}
        >
          <Select
            value={templateId}
            onChange={(_e, data) => setTemplateId(data.value)}
            disabled={!equipmentId}
          >
            <option value="">-- Select template --</option>
            {filteredTemplates.map((tmpl) => (
              <option key={tmpl.pmTemplateId} value={tmpl.pmTemplateId}>
                {tmpl.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Scheduled Date"
          required
          validationMessage={getFieldError(errors, 'scheduledDate')}
          validationState={getFieldError(errors, 'scheduledDate') ? 'error' : 'none'}
        >
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
          />
        </Field>

        <div className={styles.actions}>
          <Button appearance="primary" onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Scheduling...' : 'Schedule'}
          </Button>
          <Button appearance="secondary" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
