import { useState } from 'react'
import { Button, makeStyles, Title2, tokens } from '@fluentui/react-components'
import { useNavigate } from 'react-router-dom'
import EquipmentForm from '../components/EquipmentForm'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import type { Equipment } from '../types'
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
})

export default function EquipmentCreatePage() {
  const styles = useStyles()
  const navigate = useNavigate()
  const { equipmentService, teamService, personService, locationService } = useServices()
  const [saving, setSaving] = useState(false)

  const { data: refData, loading, error, reload } = useAsyncData(
    async () => {
      const [teams, persons, locations] = await Promise.all([
        teamService.getAll({ top: 500 }),
        personService.getAll({ top: 500 }),
        locationService.getAll({ top: 500 }),
      ])
      return { teams: teams.data, persons: persons.data, locations: locations.data }
    },
    [],
  )

  const handleCancel = () => {
    void navigate('/equipment')
  }

  const handleSave = async (equipment: Partial<Equipment>) => {
    if (saving) return
    setSaving(true)
    try {
      await equipmentService.create(equipment)
      void navigate('/equipment')
    } catch {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState />
  if (error || !refData) return <ErrorState message={error ?? 'Failed to load'} onRetry={reload} />

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button appearance="subtle" onClick={handleCancel} disabled={saving}>
          Back
        </Button>
        <Title2 as="h1">Create Equipment</Title2>
      </div>

      <EquipmentForm
        teams={refData.teams}
        persons={refData.persons}
        locations={refData.locations}
        onSave={(eq) => void handleSave(eq)}
        onCancel={handleCancel}
        saveLabel={saving ? 'Saving...' : 'Save'}
      />
    </div>
  )
}
