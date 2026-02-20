import { useState, useMemo, useCallback } from 'react'
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
import type { Equipment, Person } from '../types'
import { IssuePriority, IssueStatus } from '../types'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import { useServices } from '../contexts/ServiceContext'
import { useAsyncData } from '../hooks/useAsyncData'

const PAGE_SIZE = 25

const priorityColorMap: Record<IssuePriority, 'danger' | 'warning' | 'important' | 'success'> = {
  [IssuePriority.Critical]: 'danger',
  [IssuePriority.High]: 'important',
  [IssuePriority.Medium]: 'warning',
  [IssuePriority.Low]: 'success',
}

const statusColorMap: Record<
  IssueStatus,
  'success' | 'brand' | 'warning' | 'subtle' | 'informative'
> = {
  [IssueStatus.Open]: 'informative',
  [IssueStatus.InProgress]: 'brand',
  [IssueStatus.AwaitingParts]: 'warning',
  [IssueStatus.Resolved]: 'success',
  [IssueStatus.Closed]: 'subtle',
}

const statusLabelMap: Record<IssueStatus, string> = {
  [IssueStatus.Open]: 'Open',
  [IssueStatus.InProgress]: 'In Progress',
  [IssueStatus.AwaitingParts]: 'Awaiting Parts',
  [IssueStatus.Resolved]: 'Resolved',
  [IssueStatus.Closed]: 'Closed',
}

function getEquipmentCode(equipmentId: string, equipment: Equipment[]): string {
  const equip = equipment.find((e) => e.equipmentId === equipmentId)
  return equip?.equipmentCode ?? 'N/A'
}

function getPersonName(personId: string | null, persons: Person[]): string {
  if (!personId) return 'Unassigned'
  const person = persons.find((p) => p.personId === personId)
  return person?.displayName ?? 'Unknown'
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
  { key: 'equipmentCode', label: 'Equipment' },
  { key: 'title', label: 'Title' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'assignedTo', label: 'Assigned To' },
]

const STATUS_ALL = '__all__'

export default function IssueListPage() {
  const styles = useStyles()
  const navigate = useNavigate()
  const { equipmentIssueService, equipmentService, personService } = useServices()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_ALL)
  const [currentPage, setCurrentPage] = useState(1)

  const fetcher = useCallback(async () => {
    const [issues, equipment, persons] = await Promise.all([
      equipmentIssueService.getAll({ top: 5000 }),
      equipmentService.getAll({ top: 5000 }),
      personService.getAll({ top: 500 }),
    ])
    return {
      issues: issues.data,
      equipment: equipment.data,
      persons: persons.data,
    }
  }, [equipmentIssueService, equipmentService, personService])

  const { data, loading, error, reload } = useAsyncData(fetcher, [])

  const filteredIssues = useMemo(() => {
    if (!data) return []
    let result = [...data.issues]

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase()
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query),
      )
    }

    if (statusFilter !== STATUS_ALL) {
      result = result.filter((item) => item.status === statusFilter)
    }

    return result
  }, [data, searchQuery, statusFilter])

  if (loading) return <LoadingState />
  if (error || !data)
    return <ErrorState message={error ?? 'Failed to load issues'} onRetry={reload} />

  const totalItems = filteredIssues.length
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * PAGE_SIZE
  const paginatedIssues = filteredIssues.slice(startIndex, startIndex + PAGE_SIZE)
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

  const handleRowClick = (issueId: string) => {
    void navigate(`/issues/${issueId}`)
  }

  const handleReportIssue = () => {
    void navigate('/issues/new')
  }

  return (
    <div className={styles.page}>
      <Title2 as="h1">Equipment Issues</Title2>

      <div className={styles.toolbar}>
        <Input
          className={styles.searchInput}
          placeholder="Search by title or description..."
          value={searchQuery}
          onChange={handleSearchChange}
          type="search"
          aria-label="Search issues"
        />
        <Select className={styles.statusFilter} value={statusFilter} onChange={handleStatusChange}>
          <option value={STATUS_ALL}>All Statuses</option>
          <option value={IssueStatus.Open}>Open</option>
          <option value={IssueStatus.InProgress}>In Progress</option>
          <option value={IssueStatus.AwaitingParts}>Awaiting Parts</option>
          <option value={IssueStatus.Resolved}>Resolved</option>
          <option value={IssueStatus.Closed}>Closed</option>
        </Select>
        <div className={styles.spacer} />
        <Button appearance="primary" onClick={handleReportIssue}>
          Report Issue
        </Button>
      </div>

      {totalItems === 0 ? (
        <div className={styles.emptyState}>
          <Text size={400} weight="semibold">
            No issues found
          </Text>
          <Text size={300}>Try adjusting your search or filter criteria.</Text>
        </div>
      ) : (
        <>
          <Table aria-label="Equipment issues list">
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHeaderCell key={col.key}>{col.label}</TableHeaderCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedIssues.map((item) => (
                <TableRow
                  key={item.issueId}
                  className={styles.tableRow}
                  onClick={() => handleRowClick(item.issueId)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter') {
                      handleRowClick(item.issueId)
                    }
                  }}
                >
                  <TableCell>{getEquipmentCode(item.equipmentId, data.equipment)}</TableCell>
                  <TableCell>{item.title}</TableCell>
                  <TableCell>
                    <Badge appearance="filled" color={priorityColorMap[item.priority]}>
                      {item.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge appearance="filled" color={statusColorMap[item.status]}>
                      {statusLabelMap[item.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.dueDate}</TableCell>
                  <TableCell>{getPersonName(item.assignedToPersonId, data.persons)}</TableCell>
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
