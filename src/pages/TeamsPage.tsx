import { useState, useMemo } from 'react'
import {
  Badge,
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
  Text,
  Title2,
  tokens,
} from '@fluentui/react-components'
import { useNavigate } from 'react-router-dom'
import { mockTeams, mockPersons, mockLocations } from '../services/mockData'

const PAGE_SIZE = 25

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
  { key: 'teamCode', label: 'Team Code' },
  { key: 'name', label: 'Name' },
  { key: 'mainContact', label: 'Main Contact' },
  { key: 'mainLocation', label: 'Main Location' },
  { key: 'active', label: 'Active' },
]

const ACTIVE_ALL = '__all__'

function getPersonName(personId: string): string {
  const person = mockPersons.find((p) => p.personId === personId)
  return person?.displayName ?? 'Unknown'
}

function getLocationName(locationId: string): string {
  const loc = mockLocations.find((l) => l.locationId === locationId)
  return loc?.name ?? 'Unknown'
}

export default function TeamsPage() {
  const styles = useStyles()
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>(ACTIVE_ALL)
  const [currentPage, setCurrentPage] = useState(1)

  const filteredTeams = useMemo(() => {
    let result = mockTeams

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase()
      result = result.filter(
        (team) =>
          team.name.toLowerCase().includes(query) || team.teamCode.toLowerCase().includes(query),
      )
    }

    if (activeFilter !== ACTIVE_ALL) {
      const isActive = activeFilter === 'true'
      result = result.filter((team) => team.active === isActive)
    }

    return result
  }, [searchQuery, activeFilter])

  const totalItems = filteredTeams.length
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * PAGE_SIZE
  const paginatedTeams = filteredTeams.slice(startIndex, startIndex + PAGE_SIZE)
  const showingFrom = totalItems === 0 ? 0 : startIndex + 1
  const showingTo = Math.min(startIndex + PAGE_SIZE, totalItems)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setCurrentPage(1)
  }

  const handleActiveFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveFilter(e.target.value)
    setCurrentPage(1)
  }

  const handleRowClick = (teamId: string) => {
    void navigate(`/teams/${teamId}`)
  }

  const handleAddTeam = () => {
    void navigate('/teams/new')
  }

  return (
    <div className={styles.page}>
      <Title2 as="h1">Teams</Title2>

      <div className={styles.toolbar}>
        <Input
          className={styles.searchInput}
          placeholder="Search by name or code..."
          value={searchQuery}
          onChange={handleSearchChange}
          type="search"
          aria-label="Search teams"
        />
        <Select
          className={styles.statusFilter}
          value={activeFilter}
          onChange={handleActiveFilterChange}
        >
          <option value={ACTIVE_ALL}>All Teams</option>
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
        </Select>
        <div className={styles.spacer} />
        <Button appearance="primary" onClick={handleAddTeam}>
          Add Team
        </Button>
      </div>

      {totalItems === 0 ? (
        <div className={styles.emptyState}>
          <Text size={400} weight="semibold">
            No teams found
          </Text>
          <Text size={300}>Try adjusting your search or filter criteria.</Text>
        </div>
      ) : (
        <>
          <Table aria-label="Teams list">
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHeaderCell key={col.key}>{col.label}</TableHeaderCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTeams.map((team) => (
                <TableRow
                  key={team.teamId}
                  className={styles.tableRow}
                  onClick={() => handleRowClick(team.teamId)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter') {
                      handleRowClick(team.teamId)
                    }
                  }}
                >
                  <TableCell>{team.teamCode}</TableCell>
                  <TableCell>{team.name}</TableCell>
                  <TableCell>{getPersonName(team.mainContactPersonId)}</TableCell>
                  <TableCell>{getLocationName(team.mainLocationId)}</TableCell>
                  <TableCell>
                    <Badge appearance="filled" color={team.active ? 'success' : 'danger'}>
                      {team.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
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
