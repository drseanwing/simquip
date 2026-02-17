import { Button, makeStyles, Text, Title2, tokens } from '@fluentui/react-components'
import { useNavigate, useParams } from 'react-router-dom'
import type { Equipment } from '../types'
import { mockEquipment } from '../services/mockData'
import EquipmentForm from '../components/EquipmentForm'

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

  if (!id) {
    return <Text>Invalid URL</Text>
  }

  const existing = mockEquipment.find((e) => e.equipmentId === id)

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

  const handleCancel = () => {
    void navigate(`/equipment/${id}`)
  }

  const handleSave = (equipment: Partial<Equipment>) => {
    const index = mockEquipment.findIndex((e) => e.equipmentId === id)
    if (index !== -1) {
      mockEquipment[index] = { ...mockEquipment[index], ...equipment } as Equipment
    }
    setTimeout(() => {
      void navigate('/equipment')
    }, 1000)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button appearance="subtle" onClick={handleCancel}>
          Back
        </Button>
        <Title2 as="h1">Edit Equipment</Title2>
      </div>

      <EquipmentForm
        initialData={existing}
        onSave={handleSave}
        onCancel={handleCancel}
        saveLabel="Save"
      />
    </div>
  )
}
