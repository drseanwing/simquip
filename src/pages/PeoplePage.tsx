import { useState, useMemo } from 'react'
import {
  Badge,
  Button,
  Field,
  Input,
  makeStyles,
  Select,
  Switch,
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
import { mockPersons, mockTeams } from '../services/mockData'
import { validatePerson } from '../services/validators'
import type { Person } from '../types'

const PAGE_SIZE = 25

const ACTIVE_ALL = '__all__'

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
  selectedRow: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
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
  detailPanel: {
    display: 'flex',
    gap: tokens.spacingHorizontalXXL,
    flexWrap: 'wrap',
  },
  formPanel: {
    flex: '1 1 400px',
    maxWidth: '640px',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingVerticalL,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow4,
  },
  formActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalM,
  },
  successMessage: {
    color: tokens.colorPaletteGreenForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
})

const columns = [
  { key: 'displayName', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'team', label: 'Team' },
  { key: 'active', label: 'Active' },
]

function getTeamName(teamId: string | null): string {
  if (!teamId) return 'None'
  const team = mockTeams.find((t) => t.teamId === teamId)
  return team?.name ?? 'Unknown'
}

function getFieldError(
  errors: Array<{ field?: string; message: string }>,
  fieldName: string,
): string | undefined {
  const err = errors.find((e) => e.field === fieldName)
  return err?.message
}

export default function PeoplePage() {
  const styles = useStyles()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>(ACTIVE_ALL)
  const [currentPage, setCurrentPage] = useState(1)

  // Form state
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [teamId, setTeamId] = useState('')
  const [active, setActive] = useState(true)
  const [errors, setErrors] = useState<Array<{ field?: string; message: string }>>([])
  const [showSuccess, setShowSuccess] = useState(false)

  const activeTeams = mockTeams.filter((t) => t.active)

  const filteredPeople = useMemo(() => {
    let result = [...mockPersons]

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase()
      result = result.filter(
        (person) =>
          person.displayName.toLowerCase().includes(query) ||
          person.email.toLowerCase().includes(query),
      )
    }

    if (activeFilter !== ACTIVE_ALL) {
      const isActive = activeFilter === 'true'
      result = result.filter((person) => person.active === isActive)
    }

    return result
  }, [searchQuery, activeFilter])

  const totalItems = filteredPeople.length
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * PAGE_SIZE
  const paginatedPeople = filteredPeople.slice(startIndex, startIndex + PAGE_SIZE)
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

  const loadPersonIntoForm = (person: Person) => {
    setSelectedPerson(person)
    setIsCreating(false)
    setDisplayName(person.displayName)
    setEmail(person.email)
    setPhone(person.phone)
    setTeamId(person.teamId ?? '')
    setActive(person.active)
    setErrors([])
    setShowSuccess(false)
  }

  const handleRowClick = (person: Person) => {
    loadPersonIntoForm(person)
  }

  const handleAddPerson = () => {
    setSelectedPerson(null)
    setIsCreating(true)
    setDisplayName('')
    setEmail('')
    setPhone('')
    setTeamId('')
    setActive(true)
    setErrors([])
    setShowSuccess(false)
  }

  const handleCancel = () => {
    setSelectedPerson(null)
    setIsCreating(false)
    setErrors([])
    setShowSuccess(false)
  }

  const handleSave = () => {
    const person: Partial<Person> = {
      displayName: displayName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      teamId: teamId || null,
      active,
    }

    const validationErrors = validatePerson(person)
    if (validationErrors.length > 0) {
      setErrors(validationErrors.map((e) => ({ field: e.field, message: e.message })))
      setShowSuccess(false)
      return
    }

    if (isCreating) {
      const newPerson: Person = {
        ...(person as Person),
        personId: crypto.randomUUID(),
      }
      mockPersons.push(newPerson)
      setSelectedPerson(newPerson)
    } else if (selectedPerson) {
      const index = mockPersons.findIndex((p) => p.personId === selectedPerson.personId)
      if (index !== -1) {
        mockPersons[index] = { ...mockPersons[index], ...person } as Person
        setSelectedPerson(mockPersons[index])
      }
    }

    setIsCreating(false)
    setErrors([])
    setShowSuccess(true)
  }

  const showForm = isCreating || selectedPerson !== null

  return (
    <div className={styles.page}>
      <Title2 as="h1">People</Title2>

      <div className={styles.toolbar}>
        <Input
          className={styles.searchInput}
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={handleSearchChange}
          type="search"
          aria-label="Search people"
        />
        <Select
          className={styles.statusFilter}
          value={activeFilter}
          onChange={handleActiveFilterChange}
        >
          <option value={ACTIVE_ALL}>All People</option>
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
        </Select>
        <div className={styles.spacer} />
        <Button appearance="primary" onClick={handleAddPerson}>
          Add Person
        </Button>
      </div>

      <div className={styles.detailPanel}>
        <div style={{ flex: '2 1 500px' }}>
          {totalItems === 0 ? (
            <div className={styles.emptyState}>
              <Text size={400} weight="semibold">
                No people found
              </Text>
              <Text size={300}>Try adjusting your search or filter criteria.</Text>
            </div>
          ) : (
            <>
              <Table aria-label="People list">
                <TableHeader>
                  <TableRow>
                    {columns.map((col) => (
                      <TableHeaderCell key={col.key}>{col.label}</TableHeaderCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPeople.map((person) => (
                    <TableRow
                      key={person.personId}
                      className={`${styles.tableRow} ${selectedPerson?.personId === person.personId ? styles.selectedRow : ''}`}
                      onClick={() => handleRowClick(person)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === 'Enter') {
                          handleRowClick(person)
                        }
                      }}
                    >
                      <TableCell>{person.displayName}</TableCell>
                      <TableCell>{person.email}</TableCell>
                      <TableCell>{person.phone}</TableCell>
                      <TableCell>{getTeamName(person.teamId)}</TableCell>
                      <TableCell>
                        <Badge appearance="filled" color={person.active ? 'success' : 'danger'}>
                          {person.active ? 'Active' : 'Inactive'}
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

        {showForm && (
          <div className={styles.formPanel}>
            <Text size={400} weight="semibold">
              {isCreating ? 'New Person' : 'Edit Person'}
            </Text>

            {showSuccess && (
              <Text className={styles.successMessage}>
                Person {isCreating ? 'created' : 'updated'} successfully!
              </Text>
            )}

            <Field
              label="Display Name"
              required
              validationMessage={getFieldError(errors, 'displayName')}
              validationState={getFieldError(errors, 'displayName') ? 'error' : 'none'}
            >
              <Input value={displayName} onChange={(_e, data) => setDisplayName(data.value)} />
            </Field>

            <Field
              label="Email"
              required
              validationMessage={getFieldError(errors, 'email')}
              validationState={getFieldError(errors, 'email') ? 'error' : 'none'}
            >
              <Input value={email} onChange={(_e, data) => setEmail(data.value)} type="email" />
            </Field>

            <Field label="Phone">
              <Input value={phone} onChange={(_e, data) => setPhone(data.value)} type="tel" />
            </Field>

            <Field label="Team">
              <Select value={teamId} onChange={(_e, data) => setTeamId(data.value)}>
                <option value="">-- No team --</option>
                {activeTeams.map((team) => (
                  <option key={team.teamId} value={team.teamId}>
                    {team.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Active">
              <Switch checked={active} onChange={(_e, data) => setActive(data.checked)} />
            </Field>

            <div className={styles.formActions}>
              <Button appearance="primary" onClick={handleSave}>
                {isCreating ? 'Create' : 'Save'}
              </Button>
              <Button appearance="secondary" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
