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
  Text,
  Title2,
  tokens,
} from '@fluentui/react-components'
import { useNavigate } from 'react-router-dom'
import { LoanStatus } from '../types'
import StatusBadge from '../components/StatusBadge'
import { mockLoanTransfers, mockEquipment, mockTeams } from '../services/mockData'

const PAGE_SIZE = 25

const STATUS_ALL = '__all__'

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
  { key: 'equipment', label: 'Equipment' },
  { key: 'originTeam', label: 'Origin Team' },
  { key: 'recipientTeam', label: 'Recipient Team' },
  { key: 'startDate', label: 'Start Date' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'status', label: 'Status' },
  { key: 'reason', label: 'Reason' },
]

function getEquipmentName(equipmentId: string): string {
  const equip = mockEquipment.find((e) => e.equipmentId === equipmentId)
  return equip?.name ?? 'Unknown Equipment'
}

function getTeamName(teamId: string): string {
  const team = mockTeams.find((t) => t.teamId === teamId)
  return team?.name ?? 'Unknown Team'
}

export default function LoansPage() {
  const styles = useStyles()
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_ALL)
  const [currentPage, setCurrentPage] = useState(1)

  const filteredLoans = useMemo(() => {
    let result = mockLoanTransfers

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase()
      result = result.filter((loan) => {
        const equipName = getEquipmentName(loan.equipmentId)
        return equipName.toLowerCase().includes(query)
      })
    }

    if (statusFilter !== STATUS_ALL) {
      result = result.filter((loan) => loan.status === statusFilter)
    }

    return result
  }, [searchQuery, statusFilter])

  const totalItems = filteredLoans.length
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * PAGE_SIZE
  const paginatedLoans = filteredLoans.slice(startIndex, startIndex + PAGE_SIZE)
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

  const handleRowClick = (loanId: string) => {
    void navigate(`/loans/${loanId}`)
  }

  const handleNewLoan = () => {
    void navigate('/loans/new')
  }

  return (
    <div className={styles.page}>
      <Title2 as="h1">Loans / Transfers</Title2>

      <div className={styles.toolbar}>
        <Input
          className={styles.searchInput}
          placeholder="Search by equipment name..."
          value={searchQuery}
          onChange={handleSearchChange}
          type="search"
          aria-label="Search loans"
        />
        <Select className={styles.statusFilter} value={statusFilter} onChange={handleStatusChange}>
          <option value={STATUS_ALL}>All Statuses</option>
          <option value={LoanStatus.Draft}>Draft</option>
          <option value={LoanStatus.Active}>Active</option>
          <option value={LoanStatus.Overdue}>Overdue</option>
          <option value={LoanStatus.Returned}>Returned</option>
          <option value={LoanStatus.Cancelled}>Cancelled</option>
        </Select>
        <div className={styles.spacer} />
        <Button appearance="primary" onClick={handleNewLoan}>
          New Loan
        </Button>
      </div>

      {totalItems === 0 ? (
        <div className={styles.emptyState}>
          <Text size={400} weight="semibold">
            No loans found
          </Text>
          <Text size={300}>Try adjusting your search or filter criteria.</Text>
        </div>
      ) : (
        <>
          <Table aria-label="Loans list">
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHeaderCell key={col.key}>{col.label}</TableHeaderCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLoans.map((loan) => (
                <TableRow
                  key={loan.loanTransferId}
                  className={styles.tableRow}
                  onClick={() => handleRowClick(loan.loanTransferId)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter') {
                      handleRowClick(loan.loanTransferId)
                    }
                  }}
                >
                  <TableCell>{getEquipmentName(loan.equipmentId)}</TableCell>
                  <TableCell>{getTeamName(loan.originTeamId)}</TableCell>
                  <TableCell>{getTeamName(loan.recipientTeamId)}</TableCell>
                  <TableCell>{loan.startDate}</TableCell>
                  <TableCell>{loan.dueDate}</TableCell>
                  <TableCell>
                    <StatusBadge status={loan.status} />
                  </TableCell>
                  <TableCell>{loan.reasonCode}</TableCell>
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
