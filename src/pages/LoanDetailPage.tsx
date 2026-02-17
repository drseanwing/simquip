import { Button, makeStyles, Text, Title2, Title3, tokens } from '@fluentui/react-components'
import { useNavigate, useParams } from 'react-router-dom'
import { LoanStatus } from '../types'
import StatusBadge from '../components/StatusBadge'
import { mockLoanTransfers, mockEquipment, mockTeams, mockPersons } from '../services/mockData'

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

function getEquipmentDisplay(equipmentId: string): { name: string; code: string } {
  const equip = mockEquipment.find((e) => e.equipmentId === equipmentId)
  return {
    name: equip?.name ?? 'Unknown Equipment',
    code: equip?.equipmentCode ?? 'N/A',
  }
}

function getTeamName(teamId: string): string {
  const team = mockTeams.find((t) => t.teamId === teamId)
  return team?.name ?? 'Unknown Team'
}

function getPersonName(personId: string): string {
  const person = mockPersons.find((p) => p.personId === personId)
  return person?.displayName ?? 'Unknown'
}

export default function LoanDetailPage() {
  const styles = useStyles()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  if (!id) {
    return <Text>Invalid URL</Text>
  }

  const loan = mockLoanTransfers.find((l) => l.loanTransferId === id)

  if (!loan) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <Button appearance="subtle" onClick={() => void navigate('/loans')}>
            Back
          </Button>
          <Title2 as="h1">Loan Not Found</Title2>
        </div>
        <Text>No loan found with ID: {id}</Text>
      </div>
    )
  }

  const equipment = getEquipmentDisplay(loan.equipmentId)

  const handleBack = () => {
    void navigate('/loans')
  }

  const handleActivate = () => {
    // Mock: in a real app this would call a service
    void navigate('/loans')
  }

  const handleReturn = () => {
    void navigate('/loans')
  }

  const handleCancel = () => {
    void navigate('/loans')
  }

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
        <Title3 as="h1">{equipment.name}</Title3>
        <Text>({equipment.code})</Text>
        <StatusBadge status={loan.status} />
        <div className={styles.headerActions}>
          {isDraft && (
            <>
              <Button appearance="primary" onClick={handleActivate}>
                Activate
              </Button>
              <Button appearance="secondary" onClick={handleCancel}>
                Cancel Loan
              </Button>
            </>
          )}
          {isActive && (
            <>
              <Button appearance="primary" onClick={handleReturn}>
                Return
              </Button>
              <Button appearance="secondary" onClick={handleCancel}>
                Cancel Loan
              </Button>
            </>
          )}
        </div>
      </div>

      <div className={styles.infoGrid}>
        <Text className={styles.label}>Equipment</Text>
        <Text>
          {equipment.name} ({equipment.code})
        </Text>

        <Text className={styles.label}>Status</Text>
        <StatusBadge status={loan.status} />

        <Text className={styles.label}>Origin Team</Text>
        <Text>{getTeamName(loan.originTeamId)}</Text>

        <Text className={styles.label}>Recipient Team</Text>
        <Text>{getTeamName(loan.recipientTeamId)}</Text>

        <Text className={styles.label}>Start Date</Text>
        <Text>{loan.startDate}</Text>

        <Text className={styles.label}>Due Date</Text>
        <Text>{loan.dueDate}</Text>

        <Text className={styles.label}>Reason</Text>
        <Text>{loan.reasonCode}</Text>

        <Text className={styles.label}>Approver</Text>
        <Text>{getPersonName(loan.approverPersonId)}</Text>

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
