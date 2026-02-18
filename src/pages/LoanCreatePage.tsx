import { useState, useMemo } from 'react'
import {
  Button,
  Checkbox,
  Field,
  makeStyles,
  Select,
  Text,
  Textarea,
  Title2,
  tokens,
} from '@fluentui/react-components'
import { useNavigate } from 'react-router-dom'
import { LoanReason, LoanStatus, OwnerType } from '../types'
import type { Equipment, LoanTransfer, Person } from '../types'
import { validateLoanTransfer } from '../services/validators'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import { useServices } from '../contexts/ServiceContext'
import { useAsyncData } from '../hooks/useAsyncData'

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
  successMessage: {
    color: tokens.colorPaletteGreenForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
})

function getFieldError(
  errors: Array<{ field?: string; message: string }>,
  fieldName: string,
): string | undefined {
  const err = errors.find((e) => e.field === fieldName)
  return err?.message
}

function getDefaultOriginTeamId(
  equipmentId: string,
  equipment: Equipment[],
  persons: Person[],
): string {
  const equip = equipment.find((e) => e.equipmentId === equipmentId)
  if (!equip) return ''

  if (equip.ownerType === OwnerType.Team && equip.ownerTeamId) {
    return equip.ownerTeamId
  }

  if (equip.ownerType === OwnerType.Person && equip.ownerPersonId) {
    const ownerPerson = persons.find((p) => p.personId === equip.ownerPersonId)
    if (ownerPerson?.teamId) {
      return ownerPerson.teamId
    }
  }

  return ''
}

export default function LoanCreatePage() {
  const styles = useStyles()
  const navigate = useNavigate()
  const { loanTransferService, equipmentService, teamService, personService } = useServices()

  const { data: refData, loading, error, reload } = useAsyncData(
    async () => {
      const [equipment, teams, persons] = await Promise.all([
        equipmentService.getAll({ top: 500 }),
        teamService.getAll({ top: 500 }),
        personService.getAll({ top: 500 }),
      ])
      return { equipment: equipment.data, teams: teams.data, persons: persons.data }
    },
    [],
  )

  const [equipmentId, setEquipmentId] = useState('')
  const [originTeamId, setOriginTeamId] = useState('')
  const [recipientTeamId, setRecipientTeamId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [reasonCode, setReasonCode] = useState('')
  const [approverPersonId, setApproverPersonId] = useState('')
  const [isInternalTransfer, setIsInternalTransfer] = useState(false)
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Array<{ field?: string; message: string }>>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  const activeEquipment = useMemo(
    () => refData?.equipment.filter((e) => e.active) ?? [],
    [refData],
  )
  const activeTeams = useMemo(
    () => refData?.teams.filter((t) => t.active) ?? [],
    [refData],
  )
  const approverPersons = useMemo(() => {
    if (!recipientTeamId || !refData) return []
    return refData.persons.filter((p) => p.active && p.teamId === recipientTeamId)
  }, [recipientTeamId, refData])

  if (loading) return <LoadingState />
  if (error || !refData) return <ErrorState message={error ?? 'Failed to load'} onRetry={reload} />

  const handleEquipmentChange = (value: string) => {
    setEquipmentId(value)
    if (value) {
      const defaultOrigin = getDefaultOriginTeamId(value, refData.equipment, refData.persons)
      setOriginTeamId(defaultOrigin)
    } else {
      setOriginTeamId('')
    }
  }

  const handleRecipientTeamChange = (value: string) => {
    setRecipientTeamId(value)
    setApproverPersonId('')
    if (value && value === originTeamId) {
      setIsInternalTransfer(true)
    } else {
      setIsInternalTransfer(false)
    }
  }

  const handleOriginTeamChange = (value: string) => {
    setOriginTeamId(value)
    if (value && value === recipientTeamId) {
      setIsInternalTransfer(true)
    } else {
      setIsInternalTransfer(false)
    }
  }

  const handleSave = async () => {
    if (saving) return

    const loan: Partial<LoanTransfer> = {
      equipmentId: equipmentId || undefined,
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
      originTeamId: originTeamId || undefined,
      recipientTeamId: recipientTeamId || undefined,
      reasonCode: (reasonCode as LoanTransfer['reasonCode']) || undefined,
      approverPersonId: approverPersonId || undefined,
      isInternalTransfer,
      status: LoanStatus.Draft,
      notes,
    }

    const validationErrors = validateLoanTransfer(loan)
    if (validationErrors.length > 0) {
      setErrors(validationErrors.map((e) => ({ field: e.field, message: e.message })))
      setShowSuccess(false)
      return
    }

    setSaving(true)
    try {
      await loanTransferService.create(loan)
      setErrors([])
      setShowSuccess(true)
      setTimeout(() => {
        void navigate('/loans')
      }, 1000)
    } catch (err: unknown) {
      setErrors([{ message: err instanceof Error ? err.message : 'Save failed' }])
      setSaving(false)
    }
  }

  const handleCancel = () => {
    void navigate('/loans')
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button appearance="subtle" onClick={handleCancel} disabled={saving}>
          Back
        </Button>
        <Title2 as="h1">Create Loan / Transfer</Title2>
      </div>

      {showSuccess && <Text className={styles.successMessage}>Loan created successfully!</Text>}

      <div className={styles.form}>
        <Field
          label="Equipment"
          required
          validationMessage={getFieldError(errors, 'equipmentId')}
          validationState={getFieldError(errors, 'equipmentId') ? 'error' : 'none'}
        >
          <Select value={equipmentId} onChange={(_e, data) => handleEquipmentChange(data.value)}>
            <option value="">-- Select equipment --</option>
            {activeEquipment.map((equip) => (
              <option key={equip.equipmentId} value={equip.equipmentId}>
                {equip.name} ({equip.equipmentCode})
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Origin Team"
          required
          hint="Auto-populated from equipment owner when possible."
          validationMessage={getFieldError(errors, 'originTeamId')}
          validationState={getFieldError(errors, 'originTeamId') ? 'error' : 'none'}
        >
          <Select value={originTeamId} onChange={(_e, data) => handleOriginTeamChange(data.value)}>
            <option value="">-- Select origin team --</option>
            {activeTeams.map((team) => (
              <option key={team.teamId} value={team.teamId}>
                {team.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Recipient Team"
          required
          validationMessage={getFieldError(errors, 'recipientTeamId')}
          validationState={getFieldError(errors, 'recipientTeamId') ? 'error' : 'none'}
        >
          <Select
            value={recipientTeamId}
            onChange={(_e, data) => handleRecipientTeamChange(data.value)}
          >
            <option value="">-- Select recipient team --</option>
            {activeTeams.map((team) => (
              <option key={team.teamId} value={team.teamId}>
                {team.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Start Date"
          required
          validationMessage={getFieldError(errors, 'startDate')}
          validationState={getFieldError(errors, 'startDate') ? 'error' : 'none'}
        >
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>

        <Field
          label="Due Date"
          required
          validationMessage={getFieldError(errors, 'dueDate')}
          validationState={getFieldError(errors, 'dueDate') ? 'error' : 'none'}
        >
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>

        <Field
          label="Reason"
          required
          validationMessage={getFieldError(errors, 'reasonCode')}
          validationState={getFieldError(errors, 'reasonCode') ? 'error' : 'none'}
        >
          <Select value={reasonCode} onChange={(_e, data) => setReasonCode(data.value)}>
            <option value="">-- Select reason --</option>
            <option value={LoanReason.Simulation}>Simulation</option>
            <option value={LoanReason.Training}>Training</option>
            <option value={LoanReason.Service}>Service</option>
            <option value={LoanReason.Other}>Other</option>
          </Select>
        </Field>

        <Field
          label="Approver"
          required
          hint={
            recipientTeamId
              ? 'Showing members of the recipient team.'
              : 'Select a recipient team first.'
          }
          validationMessage={getFieldError(errors, 'approverPersonId')}
          validationState={getFieldError(errors, 'approverPersonId') ? 'error' : 'none'}
        >
          <Select
            value={approverPersonId}
            onChange={(_e, data) => setApproverPersonId(data.value)}
            disabled={!recipientTeamId}
          >
            <option value="">-- Select approver --</option>
            {approverPersons.map((person) => (
              <option key={person.personId} value={person.personId}>
                {person.displayName}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label=""
          validationMessage={getFieldError(errors, 'isInternalTransfer')}
          validationState={getFieldError(errors, 'isInternalTransfer') ? 'error' : 'none'}
        >
          <Checkbox
            checked={isInternalTransfer}
            onChange={(_e, data) => setIsInternalTransfer(!!data.checked)}
            label="Internal Transfer (same team)"
          />
        </Field>

        <Field label="Notes">
          <Textarea
            value={notes}
            onChange={(_e, data) => setNotes(data.value)}
            placeholder="Optional notes about this loan..."
          />
        </Field>

        <div className={styles.actions}>
          <Button appearance="primary" onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button appearance="secondary" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
