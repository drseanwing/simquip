import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

/**
 * Legacy route redirect — editing is now inline on the detail page.
 */
export default function EquipmentEditPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  useEffect(() => {
    void navigate(`/equipment/${id ?? ''}`, { replace: true })
  }, [navigate, id])

  return null
}
