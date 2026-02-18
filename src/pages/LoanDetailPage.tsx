import { useCallback, useState } from 'react'
import { Button, makeStyles, Text, Title3, tokens } from '@fluentui/react-components'
import { useNavigate, useParams } from 'react-router-dom'
import { LoanStatus } from '../types'
import type { Equipment, LoanTransfer, Person, Team } from '../types'
import StatusBadge from '../components/StatusBadge'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import { useServices } from '../contexts/ServiceContext'
import { useAsyncData } from '../hooks/useAsyncData'

const useStyles = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
  },
  headerActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    marginLeft: 'auto',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '180px 1fr',
    gap: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    maxWidth: '600px',
  },
  label: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
  },
  notesBlock: {
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
})

function getEquipmentDisplay(
  equipmentId: string,
  equipment: Equipment[],
): { name: string; code: string } {
  const equip = equipment.find((e) => e.equipmentId === equipmentId)
  return {
    name: equip?.name ?? 'Unknown Equipment',
    code: equip?.equipmentCode ?? 'N/A',
  }
}

function getTeamName(teamId: string, teams: Team[]): string {
  const team = teams.find((t) => t.teamId === teamId)
  return team?.name ?? 'Unknown Team'
}

function getPersonName(personId: string, persons: Person[]): string {
  const person = persons.find((p) => p.personId === personId)
  return person?.displayName ?? 'Unknown'
}

export default function LoanDetailPage() {
  const styles = useStyles()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { loanTransferService, equipmentService, teamService, personService } = useServices()

  const fetcher = useCallback(
    async () => {
      if (!id) throw new Error('No loan ID')
      const [loan, equipmentResult, teamsResult, personsResult] = await Promise.all([
        loanTransferService.getById(id),
        equipmentService.getAll({ top: 5000 }),
        teamService.getAll({ top: 500 }),
        personService.getAll({ top: 500 }),
      ])
      return {
        loan,
        equipment: equipmentResult.data,
        teams: teamsResult.data,
        persons: personsResult.data,
      }
    },
    [id, loanTransferService, equipmentService, teamService, personService],
  )

  const { data, loading, error, reload } = useAsyncData(fetcher, [])
  const [updating, setUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  if (!id) return <Text>Invalid URL</Text>
  if (loading) return <LoadingState />
  if (error || !data) {
    return <ErrorState message={error ?? 'Failed to load loan'} onRetry={reload} />
  }

  const { loan, equipment, teams, persons } = data
  const equipDisplay = getEquipmentDisplay(loan.equipmentId, equipment)

  const handleBack = () => {
    void navigate('/loans')
  }

  const updateStatus = async (newStatus: LoanTransfer['status']) => {
    if (updating) return
    setUpdating(true)
    setUpdateError(null)
    try {
      await loanTransferService.update(id, { status: newStatus } as Partial<LoanTransfer>)
      void navigate('/loans')
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to update loan status')
      setUpdating(false)
    }
  }

  const handleActivate = () => void updateStatus(LoanStatus.Active)
  const handleReturn = () => void updateStatus(LoanStatus.Returned)
  const handleCancel = () => void updateStatus(LoanStatus.Cancelled)

  const isDraft = loan.status === LoanStatus.Draft
  const isActive = loan.status === LoanStatus.Active

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button appearance="subtle" onClick={handleBack}>
          Back
        </Button>
      </div>

      <div className={styles.titleRow}>
        <Title3 as="h1">{equipDisplay.name}</Title3>
        <Text>({equipDisplay.code})</Text>
        <StatusBadge status={loan.status} />
        <div className={styles.headerActions}>
          {isDraft && (
            <>
              <Button appearance="primary" onClick={handleActivate} disabled={updating}>
                {updating ? 'Updating...' : 'Activate'}
              </Button>
              <Button appearance="secondary" onClick={handleCancel} disabled={updating}>
                Cancel Loan
              </Button>
            </>
          )}
          {isActive && (
            <>
              <Button appearance="primary" onClick={handleReturn} disabled={updating}>
                {updating ? 'Updating...' : 'Return'}
              </Button>
              <Button appearance="secondary" onClick={handleCancel} disabled={updating}>
                Cancel Loan
              </Button>
            </>
          )}
        </div>
      </div>

      {updateError && (
        <Text style={{ color: tokens.colorPaletteRedForeground1 }}>{updateError}</Text>
      )}

      <div className={styles.infoGrid}>
        <Text className={styles.label}>Equipment</Text>
        <Text>
          {equipDisplay.name} ({equipDisplay.code})
        </Text>

        <Text className={styles.label}>Status</Text>
        <StatusBadge status={loan.status} />

        <Text className={styles.label}>Origin Team</Text>
        <Text>{getTeamName(loan.originTeamId, teams)}</Text>

        <Text className={styles.label}>Recipient Team</Text>
        <Text>{getTeamName(loan.recipientTeamId, teams)}</Text>

        <Text className={styles.label}>Start Date</Text>
        <Text>{loan.startDate}</Text>

        <Text className={styles.label}>Due Date</Text>
        <Text>{loan.dueDate}</Text>

        <Text className={styles.label}>Reason</Text>
        <Text>{loan.reasonCode}</Text>

        <Text className={styles.label}>Approver</Text>
        <Text>{getPersonName(loan.approverPersonId, persons)}</Text>

        <Text className={styles.label}>Internal Transfer</Text>
        <Text>{loan.isInternalTransfer ? 'Yes' : 'No'}</Text>

        <Text className={styles.label}>Notes</Text>
        {loan.notes ? (
          <div className={styles.notesBlock}>{loan.notes}</div>
        ) : (
          <Text>No notes.</Text>
        )}
      </div>
    </div>
  )
}
