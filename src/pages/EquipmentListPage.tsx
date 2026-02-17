import { useState, useMemo } from 'react'
import {
  Button,
  Input,
  makeStyles,
  Select,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Title2,
  tokens,
  Text,
} from '@fluentui/react-components'
import { useNavigate } from 'react-router-dom'
import type { Equipment } from '../types'
import { EquipmentStatus, OwnerType } from '../types'
import StatusBadge from '../components/StatusBadge'

const PAGE_SIZE = 5

const MOCK_EQUIPMENT: Equipment[] = [
  {
    equipmentId: '1',
    equipmentCode: 'SIM-001',
    name: 'SimMan 3G Plus',
    description: 'High-fidelity patient simulator',
    ownerType: OwnerType.Team,
    ownerTeamId: 'team-1',
    ownerPersonId: null,
    contactPersonId: 'person-1',
    homeLocationId: 'loc-1',
    parentEquipmentId: null,
    quickStartFlowChartJson: '{}',
    contentsListJson: '[]',
    status: EquipmentStatus.Available,
    active: true,
  },
  {
    equipmentId: '2',
    equipmentCode: 'SIM-002',
    name: 'SimBaby',
    description: 'Infant patient simulator',
    ownerType: OwnerType.Team,
    ownerTeamId: 'team-1',
    ownerPersonId: null,
    contactPersonId: 'person-2',
    homeLocationId: 'loc-2',
    parentEquipmentId: null,
    quickStartFlowChartJson: '{}',
    contentsListJson: '[]',
    status: EquipmentStatus.InUse,
    active: true,
  },
  {
    equipmentId: '3',
    equipmentCode: 'SIM-003',
    name: 'Resusci Anne QCPR',
    description: 'CPR training manikin',
    ownerType: OwnerType.Person,
    ownerTeamId: null,
    ownerPersonId: 'person-3',
    contactPersonId: 'person-3',
    homeLocationId: 'loc-1',
    parentEquipmentId: null,
    quickStartFlowChartJson: '{}',
    contentsListJson: '[]',
    status: EquipmentStatus.UnderMaintenance,
    active: true,
  },
  {
    equipmentId: '4',
    equipmentCode: 'SIM-004',
    name: 'Laerdal Airway Trainer',
    description: 'Airway management training device',
    ownerType: OwnerType.Team,
    ownerTeamId: 'team-2',
    ownerPersonId: null,
    contactPersonId: 'person-1',
    homeLocationId: 'loc-3',
    parentEquipmentId: null,
    quickStartFlowChartJson: '{}',
    contentsListJson: '[]',
    status: EquipmentStatus.Available,
    active: true,
  },
  {
    equipmentId: '5',
    equipmentCode: 'SIM-005',
    name: 'Harvey Cardiopulmonary Simulator',
    description: 'Cardiopulmonary patient simulator',
    ownerType: OwnerType.Team,
    ownerTeamId: 'team-1',
    ownerPersonId: null,
    contactPersonId: 'person-2',
    homeLocationId: 'loc-2',
    parentEquipmentId: null,
    quickStartFlowChartJson: '{}',
    contentsListJson: '[]',
    status: EquipmentStatus.Retired,
    active: false,
  },
  {
    equipmentId: '6',
    equipmentCode: 'SIM-006',
    name: 'CAE Lucina',
    description: 'Maternal and neonatal simulator',
    ownerType: OwnerType.Team,
    ownerTeamId: 'team-2',
    ownerPersonId: null,
    contactPersonId: 'person-4',
    homeLocationId: 'loc-1',
    parentEquipmentId: null,
    quickStartFlowChartJson: '{}',
    contentsListJson: '[]',
    status: EquipmentStatus.Available,
    active: true,
  },
  {
    equipmentId: '7',
    equipmentCode: 'SIM-007',
    name: 'Ultrasound Training Phantom',
    description: 'Ultrasound-guided procedure trainer',
    ownerType: OwnerType.Person,
    ownerTeamId: null,
    ownerPersonId: 'person-5',
    contactPersonId: 'person-5',
    homeLocationId: 'loc-3',
    parentEquipmentId: null,
    quickStartFlowChartJson: '{}',
    contentsListJson: '[]',
    status: EquipmentStatus.InUse,
    active: true,
  },
  {
    equipmentId: '8',
    equipmentCode: 'SIM-008',
    name: 'Surgical Skills Trainer',
    description: 'Laparoscopic surgery trainer',
    ownerType: OwnerType.Team,
    ownerTeamId: 'team-3',
    ownerPersonId: null,
    contactPersonId: 'person-1',
    homeLocationId: 'loc-2',
    parentEquipmentId: null,
    quickStartFlowChartJson: '{}',
    contentsListJson: '[]',
    status: EquipmentStatus.Available,
    active: true,
  },
]

const MOCK_OWNERS: Record<string, string> = {
  'team-1': 'Simulation Team A',
  'team-2': 'Simulation Team B',
  'team-3': 'Surgical Training Unit',
  'person-3': 'Dr Sarah Chen',
  'person-5': 'Dr James Patel',
}

const MOCK_LOCATIONS: Record<string, string> = {
  'loc-1': 'Sim Centre Room 1',
  'loc-2': 'Sim Centre Room 2',
  'loc-3': 'Skills Lab',
}

function getOwnerName(item: Equipment): string {
  if (item.ownerType === OwnerType.Team && item.ownerTeamId) {
    return MOCK_OWNERS[item.ownerTeamId] ?? 'Unknown Team'
  }
  if (item.ownerType === OwnerType.Person && item.ownerPersonId) {
    return MOCK_OWNERS[item.ownerPersonId] ?? 'Unknown Person'
  }
  return 'Unassigned'
}

function getLocationName(item: Equipment): string {
  return MOCK_LOCATIONS[item.homeLocationId] ?? 'Unknown Location'
}

const useStyles = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
  },
  searchInput: {
    minWidth: '240px',
    flexGrow: 1,
    maxWidth: '400px',
  },
  statusFilter: {
    minWidth: '180px',
  },
  spacer: {
    flexGrow: 1,
  },
  tableRow: {
    cursor: 'pointer',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: tokens.spacingHorizontalM,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacingVerticalXXL,
    gap: tokens.spacingVerticalM,
  },
  loadingState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacingVerticalXXL,
  },
})

const columns = [
  { key: 'equipmentCode', label: 'Equipment Code' },
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Status' },
  { key: 'owner', label: 'Owner' },
  { key: 'location', label: 'Location' },
]

const STATUS_ALL = '__all__'

export default function EquipmentListPage() {
  const styles = useStyles()
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_ALL)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading] = useState(false)

  const filteredEquipment = useMemo(() => {
    let result = MOCK_EQUIPMENT

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase()
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.equipmentCode.toLowerCase().includes(query),
      )
    }

    if (statusFilter !== STATUS_ALL) {
      result = result.filter((item) => item.status === statusFilter)
    }

    return result
  }, [searchQuery, statusFilter])

  const totalItems = filteredEquipment.length
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * PAGE_SIZE
  const paginatedEquipment = filteredEquipment.slice(startIndex, startIndex + PAGE_SIZE)
  const showingFrom = totalItems === 0 ? 0 : startIndex + 1
  const showingTo = Math.min(startIndex + PAGE_SIZE, totalItems)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setCurrentPage(1)
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value)
    setCurrentPage(1)
  }

  const handleRowClick = (equipmentId: string) => {
    void navigate(`/equipment/${equipmentId}`)
  }

  const handleAddEquipment = () => {
    void navigate('/equipment/new')
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Title2 as="h1">Equipment</Title2>
        <div className={styles.loadingState}>
          <Spinner size="large" label="Loading equipment..." />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Title2 as="h1">Equipment</Title2>

      <div className={styles.toolbar}>
        <Input
          className={styles.searchInput}
          placeholder="Search by name or code..."
          value={searchQuery}
          onChange={handleSearchChange}
          type="search"
        />
        <Select className={styles.statusFilter} value={statusFilter} onChange={handleStatusChange}>
          <option value={STATUS_ALL}>All Statuses</option>
          <option value={EquipmentStatus.Available}>Available</option>
          <option value={EquipmentStatus.InUse}>In Use</option>
          <option value={EquipmentStatus.UnderMaintenance}>Under Maintenance</option>
          <option value={EquipmentStatus.Retired}>Retired</option>
        </Select>
        <div className={styles.spacer} />
        <Button appearance="primary" onClick={handleAddEquipment}>
          Add Equipment
        </Button>
      </div>

      {totalItems === 0 ? (
        <div className={styles.emptyState}>
          <Text size={400} weight="semibold">
            No equipment found
          </Text>
          <Text size={300}>Try adjusting your search or filter criteria.</Text>
        </div>
      ) : (
        <>
          <Table aria-label="Equipment list">
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHeaderCell key={col.key}>{col.label}</TableHeaderCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEquipment.map((item) => (
                <TableRow
                  key={item.equipmentId}
                  className={styles.tableRow}
                  onClick={() => handleRowClick(item.equipmentId)}
                >
                  <TableCell>{item.equipmentCode}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell>{getOwnerName(item)}</TableCell>
                  <TableCell>{getLocationName(item)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className={styles.pagination}>
            <Text size={200}>
              Showing {showingFrom}–{showingTo} of {totalItems}
            </Text>
            <Button
              appearance="subtle"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Text size={200}>
              Page {safePage} of {totalPages}
            </Text>
            <Button
              appearance="subtle"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
