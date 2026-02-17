import { Badge } from '@fluentui/react-components'
import { EquipmentStatus, LoanStatus } from '../types'

type StatusType = EquipmentStatus | LoanStatus

const statusColorMap: Record<
  StatusType,
  'success' | 'brand' | 'warning' | 'subtle' | 'informative'
> = {
  [EquipmentStatus.Available]: 'success',
  [EquipmentStatus.InUse]: 'brand',
  [EquipmentStatus.UnderMaintenance]: 'warning',
  [EquipmentStatus.Retired]: 'subtle',
  [LoanStatus.Returned]: 'success',
  [LoanStatus.Active]: 'brand',
  [LoanStatus.Overdue]: 'warning',
  [LoanStatus.Cancelled]: 'subtle',
  [LoanStatus.Draft]: 'informative',
}

const statusLabelMap: Record<StatusType, string> = {
  [EquipmentStatus.Available]: 'Available',
  [EquipmentStatus.InUse]: 'In Use',
  [EquipmentStatus.UnderMaintenance]: 'Under Maintenance',
  [EquipmentStatus.Retired]: 'Retired',
  [LoanStatus.Returned]: 'Returned',
  [LoanStatus.Active]: 'Active',
  [LoanStatus.Overdue]: 'Overdue',
  [LoanStatus.Cancelled]: 'Cancelled',
  [LoanStatus.Draft]: 'Draft',
}

interface StatusBadgeProps {
  status: StatusType
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const color = statusColorMap[status] ?? 'subtle'
  const label = statusLabelMap[status] ?? status

  return (
    <Badge appearance="filled" color={color}>
      {label}
    </Badge>
  )
}
