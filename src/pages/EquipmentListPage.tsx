import { useState, useMemo } from 'react'
import {
  Button,
  Input,
  makeStyles,
  Select,
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
import { mockEquipment, mockTeams, mockPersons, mockLocations } from '../services/mockData'

const PAGE_SIZE = 25

function getOwnerName(item: Equipment): string {
  if (item.ownerType === OwnerType.Team && item.ownerTeamId) {
    const team = mockTeams.find((t) => t.teamId === item.ownerTeamId)
    return team ? team.name : 'Unknown Team'
  }
  if (item.ownerType === OwnerType.Person && item.ownerPersonId) {
    const person = mockPersons.find((p) => p.personId === item.ownerPersonId)
    return person ? person.displayName : 'Unknown Person'
  }
  return 'Unassigned'
}

function getLocationName(item: Equipment): string {
  const loc = mockLocations.find((l) => l.locationId === item.homeLocationId)
  return loc?.name ?? 'Unknown Location'
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

  const filteredEquipment = useMemo(() => {
    let result = [...mockEquipment]

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
          aria-label="Search equipment"
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
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter') {
                      handleRowClick(item.equipmentId)
                    }
                  }}
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
