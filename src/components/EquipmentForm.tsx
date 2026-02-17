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
  tokens,
} from '@fluentui/react-components'
import { EquipmentStatus, OwnerType } from '../types'
import type { Equipment } from '../types'
import { validateEquipment } from '../services/validators'
import { mockTeams, mockPersons, mockLocations } from '../services/mockData'

const useStyles = makeStyles({
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

export interface EquipmentFormProps {
  initialData?: Equipment
  onSave: (equipment: Partial<Equipment>) => void
  onCancel: () => void
  saveLabel?: string
}

export default function EquipmentForm({
  initialData,
  onSave,
  onCancel,
  saveLabel = 'Save',
}: EquipmentFormProps) {
  const styles = useStyles()

  const [name, setName] = useState(initialData?.name ?? '')
  const [equipmentCode, setEquipmentCode] = useState(initialData?.equipmentCode ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [ownerType, setOwnerType] = useState<OwnerType>(initialData?.ownerType ?? OwnerType.Team)
  const [ownerTeamId, setOwnerTeamId] = useState(initialData?.ownerTeamId ?? '')
  const [ownerPersonId, setOwnerPersonId] = useState(initialData?.ownerPersonId ?? '')
  const [contactPersonId, setContactPersonId] = useState(initialData?.contactPersonId ?? '')
  const [homeLocationId, setHomeLocationId] = useState(initialData?.homeLocationId ?? '')
  const [status, setStatus] = useState<EquipmentStatus>(
    initialData?.status ?? EquipmentStatus.Available,
  )
  const [errors, setErrors] = useState<Array<{ field?: string; message: string }>>([])
  const [showSuccess, setShowSuccess] = useState(false)

  const activeTeams = mockTeams.filter((t) => t.active)
  const activePersons = mockPersons.filter((p) => p.active)

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
      ...(initialData?.equipmentId ? { equipmentId: initialData.equipmentId } : {}),
      name: name.trim(),
      equipmentCode: equipmentCode.trim(),
      description: description.trim(),
      ownerType,
      ownerTeamId: ownerType === OwnerType.Team ? ownerTeamId || null : null,
      ownerPersonId: ownerType === OwnerType.Person ? ownerPersonId || null : null,
      contactPersonId: contactPersonId || '',
      homeLocationId: homeLocationId || '',
      status,
      parentEquipmentId: initialData?.parentEquipmentId ?? null,
      quickStartFlowChartJson: initialData?.quickStartFlowChartJson ?? '{}',
      contentsListJson: initialData?.contentsListJson ?? '[]',
      active: initialData?.active ?? true,
    }

    const validationErrors = validateEquipment(equipment)
    if (validationErrors.length > 0) {
      setErrors(validationErrors.map((e) => ({ field: e.field, message: e.message })))
      setShowSuccess(false)
      return
    }

    setErrors([])
    setShowSuccess(true)
    onSave(equipment)
  }

  return (
    <>
      {showSuccess && (
        <Text className={styles.successMessage}>
          Equipment {initialData ? 'updated' : 'created'} successfully!
        </Text>
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
            {saveLabel}
          </Button>
          <Button appearance="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </>
  )
}
