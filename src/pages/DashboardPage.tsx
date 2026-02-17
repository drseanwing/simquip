import { useMemo, useCallback } from 'react'
import { makeStyles, shorthands, Text } from '@fluentui/react-components'
import {
  ArrowSwapRegular,
  CalendarRegular,
  PeopleTeamRegular,
  BoxRegular,
  ArrowRightRegular,
} from '@fluentui/react-icons'
import { useNavigate } from 'react-router-dom'
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
    ...shorthands.gap('24px'),
  },
  pageHeader: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
  },
  pageTitle: {
    fontSize: '2rem',
    fontWeight: 700,
    color: 'var(--redi-navy)',
    marginTop: 0,
    marginBottom: 0,
  },
  pageSubtitle: {
    fontSize: '0.875rem',
    color: 'var(--redi-medium-gray)',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: 'var(--redi-navy)',
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    marginTop: 0,
    marginBottom: 0,
  },
  sectionIcon: {
    color: 'var(--redi-teal)',
    fontSize: '20px',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    ...shorthands.gap('16px'),
  },
  card: {
    backgroundColor: '#ffffff',
    ...shorthands.borderRadius('12px'),
    ...shorthands.border('1px', 'solid', 'var(--redi-border-gray)'),
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
    transitionProperty: 'transform, box-shadow',
    transitionDuration: '200ms',
    transitionTimingFunction: 'ease',
    cursor: 'pointer',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    },
    ':focus-visible': {
      ...shorthands.outline('3px', 'solid', 'var(--redi-teal)'),
      outlineOffset: '2px',
    },
  },
  cardAccentActive: {
    borderTopWidth: '4px',
    borderTopStyle: 'solid',
    borderTopColor: 'var(--redi-coral)',
  },
  cardAccentOverdue: {
    borderTopWidth: '4px',
    borderTopStyle: 'solid',
    borderTopColor: 'var(--redi-error)',
  },
  cardBody: {
    ...shorthands.padding('16px', '20px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
  },
  cardTitleRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    ...shorthands.gap('8px'),
  },
  equipmentName: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: 'var(--redi-navy)',
    marginTop: 0,
    marginBottom: 0,
  },
  equipmentCode: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--redi-medium-gray)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    ...shorthands.gap('10px'),
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('2px'),
  },
  detailLabel: {
    fontSize: '0.7rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    color: 'var(--redi-medium-gray)',
  },
  detailValue: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--redi-dark-gray)',
  },
  teamsRow: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    ...shorthands.padding('10px', '12px'),
    backgroundColor: 'var(--redi-light-gray)',
    ...shorthands.borderRadius('8px'),
  },
  teamName: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--redi-navy)',
    flex: 1,
    minWidth: 0,
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  arrowIcon: {
    color: 'var(--redi-coral)',
    fontSize: '16px',
    flexShrink: 0,
  },
  teamIcon: {
    color: 'var(--redi-teal)',
    fontSize: '16px',
    flexShrink: 0,
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.padding('10px', '20px'),
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: 'var(--redi-border-gray)',
    backgroundColor: '#fafafa',
  },
  footerNote: {
    fontSize: '0.75rem',
    color: 'var(--redi-medium-gray)',
    fontStyle: 'italic',
  },
  viewLink: {
    display: 'inline-flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--redi-coral)',
    cursor: 'pointer',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.padding('48px'),
    ...shorthands.gap('12px'),
    backgroundColor: '#ffffff',
    ...shorthands.borderRadius('12px'),
    ...shorthands.border('1px', 'solid', 'var(--redi-border-gray)'),
  },
  emptyIcon: {
    fontSize: '40px',
    color: 'var(--redi-light-teal)',
  },
  overdueWarning: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--redi-error)',
  },
})

function getEquipmentName(equipmentId: string, equipment: Equipment[]): string {
  return equipment.find((e) => e.equipmentId === equipmentId)?.name ?? 'Unknown'
}

function getEquipmentCode(equipmentId: string, equipment: Equipment[]): string {
  return equipment.find((e) => e.equipmentId === equipmentId)?.equipmentCode ?? ''
}

function getTeamName(teamId: string, teams: Team[]): string {
  return teams.find((t) => t.teamId === teamId)?.name ?? 'Unknown'
}

function getApproverName(personId: string, persons: Person[]): string {
  return persons.find((p) => p.personId === personId)?.displayName ?? 'Unknown'
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysUntilDue(dueDate: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + 'T00:00:00')
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function getDueLabel(dueDate: string): { text: string; isOverdue: boolean } {
  const days = daysUntilDue(dueDate)
  if (days < 0)
    return {
      text: `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`,
      isOverdue: true,
    }
  if (days === 0) return { text: 'Due today', isOverdue: false }
  if (days === 1) return { text: 'Due tomorrow', isOverdue: false }
  return { text: `${days} days remaining`, isOverdue: false }
}

export default function DashboardPage() {
  const styles = useStyles()
  const navigate = useNavigate()
  const { loanTransferService, equipmentService, teamService, personService } = useServices()

  const fetcher = useCallback(
    async () => {
      const [loansResult, equipmentResult, teamsResult, personsResult] = await Promise.all([
        loanTransferService.getAll({ top: 5000 }),
        equipmentService.getAll({ top: 5000 }),
        teamService.getAll({ top: 500 }),
        personService.getAll({ top: 500 }),
      ])
      return {
        loans: loansResult.data,
        equipment: equipmentResult.data,
        teams: teamsResult.data,
        persons: personsResult.data,
      }
    },
    [loanTransferService, equipmentService, teamService, personService],
  )

  const { data, loading, error, reload } = useAsyncData(fetcher, [])

  const activeLoans = useMemo(() => {
    if (!data) return []
    return data.loans.filter(
      (loan) => loan.status === LoanStatus.Active || loan.status === LoanStatus.Overdue,
    )
  }, [data])

  if (loading) return <LoadingState />
  if (error || !data)
    return <ErrorState message={error ?? 'Failed to load dashboard'} onRetry={reload} />

  const { equipment, teams, persons } = data

  const handleCardClick = (loan: LoanTransfer) => {
    void navigate(`/loans/${loan.loanTransferId}`)
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
        <Text className={styles.pageSubtitle}>Equipment currently on loan or transfer</Text>
      </div>

      <h2 className={styles.sectionTitle}>
        <ArrowSwapRegular className={styles.sectionIcon} />
        Active Loans ({activeLoans.length})
      </h2>

      {activeLoans.length === 0 ? (
        <div className={styles.emptyState}>
          <BoxRegular className={styles.emptyIcon} />
          <Text size={400} weight="semibold" style={{ color: 'var(--redi-navy)' }}>
            No active loans
          </Text>
          <Text size={300} style={{ color: 'var(--redi-medium-gray)' }}>
            All equipment is currently at its home location.
          </Text>
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {activeLoans.map((loan) => {
            const dueInfo = getDueLabel(loan.dueDate)

            return (
              <div
                key={loan.loanTransferId}
                className={`${styles.card} ${dueInfo.isOverdue ? styles.cardAccentOverdue : styles.cardAccentActive}`}
                role="link"
                tabIndex={0}
                onClick={() => handleCardClick(loan)}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter') handleCardClick(loan)
                }}
              >
                <div className={styles.cardBody}>
                  <div className={styles.cardTitleRow}>
                    <div>
                      <h3 className={styles.equipmentName}>
                        {getEquipmentName(loan.equipmentId, equipment)}
                      </h3>
                      <span className={styles.equipmentCode}>
                        {getEquipmentCode(loan.equipmentId, equipment)}
                      </span>
                    </div>
                    <StatusBadge status={dueInfo.isOverdue ? LoanStatus.Overdue : loan.status} />
                  </div>

                  <div className={styles.teamsRow}>
                    <PeopleTeamRegular className={styles.teamIcon} />
                    <span className={styles.teamName}>
                      {getTeamName(loan.originTeamId, teams)}
                    </span>
                    <ArrowRightRegular className={styles.arrowIcon} />
                    <span className={styles.teamName}>
                      {getTeamName(loan.recipientTeamId, teams)}
                    </span>
                  </div>

                  <div className={styles.detailsGrid}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Start Date</span>
                      <span className={styles.detailValue}>
                        <CalendarRegular
                          style={{
                            fontSize: '13px',
                            marginRight: '4px',
                            verticalAlign: 'text-bottom',
                          }}
                        />
                        {formatDate(loan.startDate)}
                      </span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Due Date</span>
                      <span className={styles.detailValue}>
                        <CalendarRegular
                          style={{
                            fontSize: '13px',
                            marginRight: '4px',
                            verticalAlign: 'text-bottom',
                          }}
                        />
                        {formatDate(loan.dueDate)}
                      </span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Reason</span>
                      <span className={styles.detailValue}>{loan.reasonCode}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Approved by</span>
                      <span className={styles.detailValue}>
                        {getApproverName(loan.approverPersonId, persons)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <span className={dueInfo.isOverdue ? styles.overdueWarning : styles.footerNote}>
                    {dueInfo.text}
                  </span>
                  <span className={styles.viewLink}>
                    View details <ArrowRightRegular />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
