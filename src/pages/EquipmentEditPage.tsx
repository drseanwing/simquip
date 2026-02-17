import { useState } from 'react'
import {
  Button,
  Field,
  Input,
  makeStyles,
  Radio,
  RadioGroup,
  Select,
  Text,
  Textarea,
  Title2,
  tokens,
} from '@fluentui/react-components'
import { useNavigate, useParams } from 'react-router-dom'
import { EquipmentStatus, OwnerType } from '../types'
import type { Equipment } from '../types'
import { validateEquipment } from '../services/validators'
import { mockEquipment, mockTeams, mockPersons, mockLocations } from '../services/mockData'

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

export default function EquipmentEditPage() {
  const styles = useStyles()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const existing = mockEquipment.find((e) => e.equipmentId === id)

  const [name, setName] = useState(existing?.name ?? '')
  const [equipmentCode, setEquipmentCode] = useState(existing?.equipmentCode ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [ownerType, setOwnerType] = useState<OwnerType>(existing?.ownerType ?? OwnerType.Team)
  const [ownerTeamId, setOwnerTeamId] = useState(existing?.ownerTeamId ?? '')
  const [ownerPersonId, setOwnerPersonId] = useState(existing?.ownerPersonId ?? '')
  const [contactPersonId, setContactPersonId] = useState(existing?.contactPersonId ?? '')
  const [homeLocationId, setHomeLocationId] = useState(existing?.homeLocationId ?? '')
  const [status, setStatus] = useState<EquipmentStatus>(
    existing?.status ?? EquipmentStatus.Available,
  )
  const [errors, setErrors] = useState<Array<{ field?: string; message: string }>>([])
  const [showSuccess, setShowSuccess] = useState(false)

  const activeTeams = mockTeams.filter((t) => t.active)
  const activePersons = mockPersons.filter((p) => p.active)

  if (!existing) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <Button appearance="subtle" onClick={() => void navigate('/equipment')}>
            Back
          </Button>
          <Title2 as="h1">Equipment Not Found</Title2>
        </div>
        <Text>No equipment found with ID: {id}</Text>
      </div>
    )
  }

  const handleOwnerTypeChange = (value: string) => {
    const newOwnerType = value as OwnerType
    setOwnerType(newOwnerType)
    if (newOwnerType === OwnerType.Team) {
      setOwnerPersonId('')
    } else {
      setOwnerTeamId('')
    }
  }

  const handleOwnerTeamChange = (value: string) => {
    setOwnerTeamId(value)
    if (value) {
      const team = mockTeams.find((t) => t.teamId === value)
      if (team && !homeLocationId) {
        setHomeLocationId(team.mainLocationId)
      }
    }
  }

  const handleSave = () => {
    const equipment: Partial<Equipment> = {
      equipmentId: id,
      name: name.trim(),
      equipmentCode: equipmentCode.trim(),
      description: description.trim(),
      ownerType,
      ownerTeamId: ownerType === OwnerType.Team ? ownerTeamId || undefined : null,
      ownerPersonId: ownerType === OwnerType.Person ? ownerPersonId || undefined : null,
      contactPersonId: contactPersonId || undefined,
      homeLocationId: homeLocationId || undefined,
      status,
      parentEquipmentId: existing.parentEquipmentId,
      quickStartFlowChartJson: existing.quickStartFlowChartJson,
      contentsListJson: existing.contentsListJson,
      active: existing.active,
    }

    const validationErrors = validateEquipment(equipment)
    if (validationErrors.length > 0) {
      setErrors(validationErrors.map((e) => ({ field: e.field, message: e.message })))
      setShowSuccess(false)
      return
    }

    setErrors([])
    setShowSuccess(true)
    setTimeout(() => {
      void navigate('/equipment')
    }, 1000)
  }

  const handleCancel = () => {
    void navigate(`/equipment/${id}`)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button appearance="subtle" onClick={handleCancel}>
          Back
        </Button>
        <Title2 as="h1">Edit Equipment</Title2>
      </div>

      {showSuccess && (
        <Text className={styles.successMessage}>Equipment updated successfully!</Text>
      )}

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
          label="Equipment Code"
          required
          validationMessage={getFieldError(errors, 'equipmentCode')}
          validationState={getFieldError(errors, 'equipmentCode') ? 'error' : 'none'}
        >
          <Input value={equipmentCode} onChange={(_e, data) => setEquipmentCode(data.value)} />
        </Field>

        <Field label="Description">
          <Textarea value={description} onChange={(_e, data) => setDescription(data.value)} />
        </Field>

        <Field
          label="Owner Type"
          required
          validationMessage={getFieldError(errors, 'ownerType')}
          validationState={getFieldError(errors, 'ownerType') ? 'error' : 'none'}
        >
          <RadioGroup
            value={ownerType}
            onChange={(_e, data) => handleOwnerTypeChange(data.value)}
            layout="horizontal"
          >
            <Radio value={OwnerType.Team} label="Team" />
            <Radio value={OwnerType.Person} label="Person" />
          </RadioGroup>
        </Field>

        {ownerType === OwnerType.Team && (
          <Field
            label="Owner Team"
            required
            validationMessage={getFieldError(errors, 'ownerTeamId')}
            validationState={getFieldError(errors, 'ownerTeamId') ? 'error' : 'none'}
          >
            <Select value={ownerTeamId} onChange={(_e, data) => handleOwnerTeamChange(data.value)}>
              <option value="">-- Select a team --</option>
              {activeTeams.map((team) => (
                <option key={team.teamId} value={team.teamId}>
                  {team.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {ownerType === OwnerType.Person && (
          <Field
            label="Owner Person"
            required
            validationMessage={getFieldError(errors, 'ownerPersonId')}
            validationState={getFieldError(errors, 'ownerPersonId') ? 'error' : 'none'}
          >
            <Select value={ownerPersonId} onChange={(_e, data) => setOwnerPersonId(data.value)}>
              <option value="">-- Select a person --</option>
              {activePersons.map((person) => (
                <option key={person.personId} value={person.personId}>
                  {person.displayName}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Contact Person">
          <Select value={contactPersonId} onChange={(_e, data) => setContactPersonId(data.value)}>
            <option value="">-- Select a contact --</option>
            {activePersons.map((person) => (
              <option key={person.personId} value={person.personId}>
                {person.displayName}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Home Location"
          hint="When a team is selected, this defaults to the team's main location."
        >
          <Select value={homeLocationId} onChange={(_e, data) => setHomeLocationId(data.value)}>
            <option value="">-- Select a location --</option>
            {mockLocations.map((loc) => (
              <option key={loc.locationId} value={loc.locationId}>
                {loc.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Status"
          required
          validationMessage={getFieldError(errors, 'status')}
          validationState={getFieldError(errors, 'status') ? 'error' : 'none'}
        >
          <Select value={status} onChange={(_e, data) => setStatus(data.value as EquipmentStatus)}>
            <option value={EquipmentStatus.Available}>Available</option>
            <option value={EquipmentStatus.InUse}>In Use</option>
            <option value={EquipmentStatus.UnderMaintenance}>Under Maintenance</option>
            <option value={EquipmentStatus.Retired}>Retired</option>
          </Select>
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
