import { useState } from 'react'
import { Button, makeStyles, Text, Title2, tokens } from '@fluentui/react-components'
import { useNavigate, useParams } from 'react-router-dom'
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

export default function EquipmentEditPage() {
  const styles = useStyles()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { equipmentService, teamService, personService, locationService } = useServices()
  const [saving, setSaving] = useState(false)

  const { data, loading, error, reload } = useAsyncData(
    async () => {
      if (!id) throw new Error('Invalid URL')
      const [existing, teams, persons, locations] = await Promise.all([
        equipmentService.getById(id),
        teamService.getAll({ top: 500 }),
        personService.getAll({ top: 500 }),
        locationService.getAll({ top: 500 }),
      ])
      return { existing, teams: teams.data, persons: persons.data, locations: locations.data }
    },
    [id],
  )

  if (!id) {
    return <Text>Invalid URL</Text>
  }

  if (loading) return <LoadingState />
  if (error || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <Button appearance="subtle" onClick={() => void navigate('/equipment')}>
            Back
          </Button>
          <Title2 as="h1">Equipment Not Found</Title2>
        </div>
        <ErrorState message={error ?? 'Equipment not found'} onRetry={reload} />
      </div>
    )
  }

  const handleCancel = () => {
    void navigate(`/equipment/${id}`)
  }

  const handleSave = async (equipment: Partial<Equipment>) => {
    if (saving) return
    setSaving(true)
    try {
      await equipmentService.update(id, equipment)
      void navigate('/equipment')
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button appearance="subtle" onClick={handleCancel} disabled={saving}>
          Back
        </Button>
        <Title2 as="h1">Edit Equipment</Title2>
      </div>

      <EquipmentForm
        initialData={data.existing}
        teams={data.teams}
        persons={data.persons}
        locations={data.locations}
        onSave={(eq) => void handleSave(eq)}
        onCancel={handleCancel}
        saveLabel={saving ? 'Saving...' : 'Save'}
      />
    </div>
  )
}
