import { useState } from 'react'
import {
  Button,
  Field,
  Input,
  makeStyles,
  Select,
  Switch,
  Text,
  Title2,
  tokens,
} from '@fluentui/react-components'
import { useNavigate } from 'react-router-dom'
import { validateTeam } from '../services/validators'
import { mockPersons, mockLocations } from '../services/mockData'
import type { Team } from '../types'

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

export default function TeamCreatePage() {
  const styles = useStyles()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [teamCode, setTeamCode] = useState('')
  const [mainContactPersonId, setMainContactPersonId] = useState('')
  const [mainLocationId, setMainLocationId] = useState('')
  const [active, setActive] = useState(true)
  const [errors, setErrors] = useState<Array<{ field?: string; message: string }>>([])
  const [showSuccess, setShowSuccess] = useState(false)

  const activePersons = mockPersons.filter((p) => p.active)

  const handleSave = () => {
    const team: Partial<Team> = {
      name: name.trim(),
      teamCode: teamCode.trim(),
      mainContactPersonId: mainContactPersonId || '',
      mainLocationId: mainLocationId || '',
      active,
    }

    const validationErrors = validateTeam(team)
    if (validationErrors.length > 0) {
      setErrors(validationErrors.map((e) => ({ field: e.field, message: e.message })))
      setShowSuccess(false)
      return
    }

    setErrors([])
    setShowSuccess(true)
    setTimeout(() => {
      void navigate('/teams')
    }, 1000)
  }

  const handleCancel = () => {
    void navigate('/teams')
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button appearance="subtle" onClick={handleCancel}>
          Back
        </Button>
        <Title2 as="h1">Create Team</Title2>
      </div>

      {showSuccess && <Text className={styles.successMessage}>Team created successfully!</Text>}

      <div className={styles.form}>
        <Field
          label="Name"
          required
          validationMessage={getFieldError(errors, 'name')}
          validationState={getFieldError(errors, 'name') ? 'error' : 'none'}
        >
          <Input value={name} onChange={(_e, data) => setName(data.value)} />
        </Field>

        <Field
          label="Team Code"
          required
          validationMessage={getFieldError(errors, 'teamCode')}
          validationState={getFieldError(errors, 'teamCode') ? 'error' : 'none'}
        >
          <Input value={teamCode} onChange={(_e, data) => setTeamCode(data.value)} />
        </Field>

        <Field label="Main Contact">
          <Select
            value={mainContactPersonId}
            onChange={(_e, data) => setMainContactPersonId(data.value)}
          >
            <option value="">-- Select a contact --</option>
            {activePersons.map((person) => (
              <option key={person.personId} value={person.personId}>
                {person.displayName}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Main Location">
          <Select value={mainLocationId} onChange={(_e, data) => setMainLocationId(data.value)}>
            <option value="">-- Select a location --</option>
            {mockLocations.map((loc) => (
              <option key={loc.locationId} value={loc.locationId}>
                {loc.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Active">
          <Switch checked={active} onChange={(_e, data) => setActive(data.checked)} />
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
