import { Title2, Text } from '@fluentui/react-components'
import { useParams } from 'react-router-dom'

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div>
      <Title2 as="h1">Equipment Detail</Title2>
      <Text>Viewing equipment: {id}</Text>
    </div>
  )
}
