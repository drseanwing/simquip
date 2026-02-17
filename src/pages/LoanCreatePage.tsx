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
import type { LoanTransfer } from '../types'
import { validateLoanTransfer } from '../services/validators'
import { mockEquipment, mockTeams, mockPersons, mockLoanTransfers } from '../services/mockData'

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

/**
 * Computes the default origin team for a given equipment item per spec 2.4:
 * - If owner is a team, default to that team.
 * - If owner is a person with exactly one active team membership, default to that team.
 * - Otherwise return empty (manual selection required).
 */
function getDefaultOriginTeamId(equipmentId: string): string {
  const equip = mockEquipment.find((e) => e.equipmentId === equipmentId)
  if (!equip) return ''

  if (equip.ownerType === OwnerType.Team && equip.ownerTeamId) {
    return equip.ownerTeamId
  }

  if (equip.ownerType === OwnerType.Person && equip.ownerPersonId) {
    const ownerPerson = mockPersons.find((p) => p.personId === equip.ownerPersonId)
    if (ownerPerson?.teamId) {
      // Person has exactly one team via teamId
      return ownerPerson.teamId
    }
  }

  return ''
}

export default function LoanCreatePage() {
  const styles = useStyles()
  const navigate = useNavigate()

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

  const activeEquipment = mockEquipment.filter((e) => e.active)
  const activeTeams = mockTeams.filter((t) => t.active)

  // Filter approver persons to those belonging to the recipient team
  const approverPersons = useMemo(() => {
    if (!recipientTeamId) return []
    return mockPersons.filter((p) => p.active && p.teamId === recipientTeamId)
  }, [recipientTeamId])

  const handleEquipmentChange = (value: string) => {
    setEquipmentId(value)
    if (value) {
      const defaultOrigin = getDefaultOriginTeamId(value)
      setOriginTeamId(defaultOrigin)
    } else {
      setOriginTeamId('')
    }
  }

  const handleRecipientTeamChange = (value: string) => {
    setRecipientTeamId(value)
    // Reset approver when recipient team changes
    setApproverPersonId('')
    // Auto-set internal transfer flag
    if (value && value === originTeamId) {
      setIsInternalTransfer(true)
    } else {
      setIsInternalTransfer(false)
    }
  }

  const handleOriginTeamChange = (value: string) => {
    setOriginTeamId(value)
    // Auto-set internal transfer flag
    if (value && value === recipientTeamId) {
      setIsInternalTransfer(true)
    } else {
      setIsInternalTransfer(false)
    }
  }

  const handleSave = () => {
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

    const newLoan = {
      ...loan,
      loanTransferId: crypto.randomUUID(),
    } as LoanTransfer
    mockLoanTransfers.push(newLoan)

    setErrors([])
    setShowSuccess(true)
    setTimeout(() => {
      void navigate('/loans')
    }, 1000)
  }

  const handleCancel = () => {
    void navigate('/loans')
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button appearance="subtle" onClick={handleCancel}>
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
          <Button appearance="primary" onClick={handleSave}>
            Save
          </Button>
          <Button appearance="secondary" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
