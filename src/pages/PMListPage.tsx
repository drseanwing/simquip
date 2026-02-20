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
import type { Equipment, PMTemplate } from '../types'
import { PMStatus } from '../types'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import { useServices } from '../contexts/ServiceContext'
import { useAsyncData } from '../hooks/useAsyncData'

const PAGE_SIZE = 25

const statusColorMap: Record<
  PMStatus,
  'informative' | 'warning' | 'success' | 'danger' | 'subtle'
> = {
  [PMStatus.Scheduled]: 'informative',
  [PMStatus.InProgress]: 'warning',
  [PMStatus.Completed]: 'success',
  [PMStatus.Overdue]: 'danger',
  [PMStatus.Cancelled]: 'subtle',
}

const statusLabelMap: Record<PMStatus, string> = {
  [PMStatus.Scheduled]: 'Scheduled',
  [PMStatus.InProgress]: 'In Progress',
  [PMStatus.Completed]: 'Completed',
  [PMStatus.Overdue]: 'Overdue',
  [PMStatus.Cancelled]: 'Cancelled',
}

function getEquipmentDisplay(equipmentId: string, equipment: Equipment[]): string {
  const equip = equipment.find((e) => e.equipmentId === equipmentId)
  if (!equip) return 'Unknown'
  return `${equip.name} (${equip.equipmentCode})`
}

function getTemplateName(templateId: string, templates: PMTemplate[]): string {
  const tmpl = templates.find((t) => t.pmTemplateId === templateId)
  return tmpl?.name ?? 'Unknown'
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
  { key: 'equipment', label: 'Equipment' },
  { key: 'template', label: 'Template' },
  { key: 'scheduledDate', label: 'Scheduled Date' },
  { key: 'status', label: 'Status' },
  { key: 'completedDate', label: 'Completed Date' },
]

const STATUS_ALL = '__all__'

export default function PMListPage() {
  const styles = useStyles()
  const navigate = useNavigate()
  const { pmTaskService, pmTemplateService, equipmentService } = useServices()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_ALL)
  const [currentPage, setCurrentPage] = useState(1)

  const fetcher = useCallback(async () => {
    const [tasks, templates, equipment] = await Promise.all([
      pmTaskService.getAll({ top: 5000 }),
      pmTemplateService.getAll({ top: 5000 }),
      equipmentService.getAll({ top: 5000 }),
    ])
    return {
      tasks: tasks.data,
      templates: templates.data,
      equipment: equipment.data,
    }
  }, [pmTaskService, pmTemplateService, equipmentService])

  const { data, loading, error, reload } = useAsyncData(fetcher, [])

  const filteredTasks = useMemo(() => {
    if (!data) return []
    let result = [...data.tasks]

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase()
      result = result.filter((task) => {
        const equipDisplay = getEquipmentDisplay(task.equipmentId, data.equipment).toLowerCase()
        const tmplName = getTemplateName(task.pmTemplateId, data.templates).toLowerCase()
        return equipDisplay.includes(query) || tmplName.includes(query)
      })
    }

    if (statusFilter !== STATUS_ALL) {
      result = result.filter((task) => task.status === statusFilter)
    }

    return result
  }, [data, searchQuery, statusFilter])

  if (loading) return <LoadingState />
  if (error || !data)
    return <ErrorState message={error ?? 'Failed to load maintenance tasks'} onRetry={reload} />

  const totalItems = filteredTasks.length
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * PAGE_SIZE
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + PAGE_SIZE)
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

  const handleRowClick = (taskId: string) => {
    void navigate(`/maintenance/${taskId}`)
  }

  const handleSchedulePM = () => {
    void navigate('/maintenance/new')
  }

  return (
    <div className={styles.page}>
      <Title2 as="h1">Preventative Maintenance</Title2>

      <div className={styles.toolbar}>
        <Input
          className={styles.searchInput}
          placeholder="Search by equipment or template..."
          value={searchQuery}
          onChange={handleSearchChange}
          type="search"
          aria-label="Search maintenance tasks"
        />
        <Select className={styles.statusFilter} value={statusFilter} onChange={handleStatusChange}>
          <option value={STATUS_ALL}>All Statuses</option>
          <option value={PMStatus.Scheduled}>Scheduled</option>
          <option value={PMStatus.InProgress}>In Progress</option>
          <option value={PMStatus.Completed}>Completed</option>
          <option value={PMStatus.Overdue}>Overdue</option>
          <option value={PMStatus.Cancelled}>Cancelled</option>
        </Select>
        <div className={styles.spacer} />
        <Button appearance="primary" onClick={handleSchedulePM}>
          Schedule PM
        </Button>
      </div>

      {totalItems === 0 ? (
        <div className={styles.emptyState}>
          <Text size={400} weight="semibold">
            No maintenance tasks found
          </Text>
          <Text size={300}>Try adjusting your search or filter criteria.</Text>
        </div>
      ) : (
        <>
          <Table aria-label="Preventative maintenance tasks list">
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHeaderCell key={col.key}>{col.label}</TableHeaderCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTasks.map((task) => (
                <TableRow
                  key={task.pmTaskId}
                  className={styles.tableRow}
                  onClick={() => handleRowClick(task.pmTaskId)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter') {
                      handleRowClick(task.pmTaskId)
                    }
                  }}
                >
                  <TableCell>{getEquipmentDisplay(task.equipmentId, data.equipment)}</TableCell>
                  <TableCell>{getTemplateName(task.pmTemplateId, data.templates)}</TableCell>
                  <TableCell>{task.scheduledDate}</TableCell>
                  <TableCell>
                    <Badge appearance="filled" color={statusColorMap[task.status]}>
                      {statusLabelMap[task.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{task.completedDate ?? '—'}</TableCell>
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
