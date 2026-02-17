import { Button, makeStyles, Title2, tokens } from '@fluentui/react-components'
import { useNavigate } from 'react-router-dom'
import EquipmentForm from '../components/EquipmentForm'
import type { Equipment } from '../types'
import { mockEquipment } from '../services/mockData'

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

  const handleCancel = () => {
    void navigate('/equipment')
  }

  const handleSave = (equipment: Partial<Equipment>) => {
    const newEquipment = {
      ...equipment,
      equipmentId: crypto.randomUUID(),
    } as Equipment
    mockEquipment.push(newEquipment)
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
        <Title2 as="h1">Create Equipment</Title2>
      </div>

      <EquipmentForm onSave={handleSave} onCancel={handleCancel} saveLabel="Save" />
    </div>
  )
}
