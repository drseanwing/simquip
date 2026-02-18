import { useCallback, useState } from 'react'
import {
  Badge,
  Button,
  makeStyles,
  Tab,
  TabList,
  Text,
  Title3,
  tokens,
} from '@fluentui/react-components'
import { useNavigate, useParams } from 'react-router-dom'
import { OwnerType } from '../types'
import type { Equipment, Location, Person } from '../types'
import StatusBadge from '../components/StatusBadge'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import { useServices } from '../contexts/ServiceContext'
import { useAsyncData } from '../hooks/useAsyncData'
import type { SelectTabData, SelectTabEvent } from '@fluentui/react-components'

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
    gridTemplateColumns: '160px 1fr',
    gap: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    maxWidth: '600px',
  },
  label: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
  },
  tabContent: {
    paddingTop: tokens.spacingVerticalL,
  },
  placeholder: {
    color: tokens.colorNeutralForeground3,
    fontStyle: 'italic',
    padding: tokens.spacingVerticalM,
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingVerticalS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  clickableItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingVerticalS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    cursor: 'pointer',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  itemList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
})

type TabValue = 'details' | 'staff' | 'locations' | 'equipment'

function getPersonName(personId: string, persons: Person[]): string {
  const person = persons.find((p) => p.personId === personId)
  return person?.displayName ?? 'Unknown'
}

function getPersonEmail(personId: string, persons: Person[]): string {
  const person = persons.find((p) => p.personId === personId)
  return person?.email ?? ''
}

function getLocationName(locationId: string, locations: Location[]): string {
  const loc = locations.find((l) => l.locationId === locationId)
  return loc?.name ?? 'Unknown'
}

export default function TeamDetailPage() {
  const styles = useStyles()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [selectedTab, setSelectedTab] = useState<TabValue>('details')
  const {
    teamService,
    personService,
    locationService,
    teamMemberService,
    equipmentService,
  } = useServices()

  const fetcher = useCallback(
    async () => {
      if (!id) throw new Error('No team ID')
      const [team, personsResult, locationsResult, teamMembersResult, equipmentResult] =
        await Promise.all([
          teamService.getById(id),
          personService.getAll({ top: 500 }),
          locationService.getAll({ top: 500 }),
          teamMemberService.getAll({ top: 500 }),
          equipmentService.getAll({ top: 5000 }),
        ])
      return {
        team,
        persons: personsResult.data,
        locations: locationsResult.data,
        teamMembers: teamMembersResult.data.filter((tm) => tm.teamId === id),
        teamEquipment: equipmentResult.data.filter(
          (e) => e.ownerType === OwnerType.Team && e.ownerTeamId === id,
        ),
      }
    },
    [id, teamService, personService, locationService, teamMemberService, equipmentService],
  )

  const { data, loading, error, reload } = useAsyncData(fetcher, [])

  if (!id) return <Text>Invalid URL</Text>
  if (loading) return <LoadingState />
  if (error || !data) {
    return <ErrorState message={error ?? 'Failed to load team'} onRetry={reload} />
  }

  const { team, persons, locations, teamMembers, teamEquipment } = data

  const teamLocationIds = new Set<string>()
  teamLocationIds.add(team.mainLocationId)
  teamEquipment.forEach((e: Equipment) => {
    if (e.homeLocationId) teamLocationIds.add(e.homeLocationId)
  })
  const teamLocations = locations.filter((l: Location) => teamLocationIds.has(l.locationId))

  const handleTabSelect = (_event: SelectTabEvent, tabData: SelectTabData) => {
    setSelectedTab(tabData.value as TabValue)
  }

  const handleEdit = () => {
    void navigate(`/teams/${id}/edit`)
  }

  const handleBack = () => {
    void navigate('/teams')
  }

  const renderDetails = () => (
    <div className={styles.infoGrid}>
      <Text className={styles.label}>Team Code</Text>
      <Text>{team.teamCode}</Text>
      <Text className={styles.label}>Name</Text>
      <Text>{team.name}</Text>
      <Text className={styles.label}>Main Contact</Text>
      <Text>{getPersonName(team.mainContactPersonId, persons)}</Text>
      <Text className={styles.label}>Main Location</Text>
      <Text>{getLocationName(team.mainLocationId, locations)}</Text>
      <Text className={styles.label}>Status</Text>
      <Badge appearance="filled" color={team.active ? 'success' : 'danger'}>
        {team.active ? 'Active' : 'Inactive'}
      </Badge>
    </div>
  )

  const renderStaff = () => {
    if (teamMembers.length === 0) {
      return <Text className={styles.placeholder}>No staff members assigned to this team.</Text>
    }
    return (
      <div className={styles.itemList}>
        {teamMembers.map((tm) => (
          <div key={tm.teamMemberId} className={styles.listItem}>
            <Text weight="semibold">{getPersonName(tm.personId, persons)}</Text>
            <Text>{getPersonEmail(tm.personId, persons)}</Text>
            <Text italic>{tm.role}</Text>
          </div>
        ))}
      </div>
    )
  }

  const renderLocations = () => {
    if (teamLocations.length === 0) {
      return <Text className={styles.placeholder}>No locations associated with this team.</Text>
    }
    return (
      <div className={styles.itemList}>
        {teamLocations.map((loc) => (
          <div key={loc.locationId} className={styles.listItem}>
            <Text weight="semibold">{loc.name}</Text>
            <Text>{loc.description}</Text>
            {loc.locationId === team.mainLocationId && (
              <Badge appearance="outline" color="brand">
                Main
              </Badge>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderEquipment = () => {
    if (teamEquipment.length === 0) {
      return <Text className={styles.placeholder}>No equipment owned by this team.</Text>
    }
    return (
      <div className={styles.itemList}>
        {teamEquipment.map((equip) => (
          <div
            key={equip.equipmentId}
            className={styles.clickableItem}
            onClick={() => void navigate(`/equipment/${equip.equipmentId}`)}
          >
            <Text weight="semibold">{equip.equipmentCode}</Text>
            <Text>{equip.name}</Text>
            <StatusBadge status={equip.status} />
          </div>
        ))}
      </div>
    )
  }

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'details':
        return renderDetails()
      case 'staff':
        return renderStaff()
      case 'locations':
        return renderLocations()
      case 'equipment':
        return renderEquipment()
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button appearance="subtle" onClick={handleBack}>
          Back
        </Button>
      </div>

      <div className={styles.titleRow}>
        <Title3 as="h1">{team.name}</Title3>
        <Text>({team.teamCode})</Text>
        <Badge appearance="filled" color={team.active ? 'success' : 'danger'}>
          {team.active ? 'Active' : 'Inactive'}
        </Badge>
        <div className={styles.headerActions}>
          <Button appearance="primary" onClick={handleEdit}>
            Edit
          </Button>
        </div>
      </div>

      <TabList selectedValue={selectedTab} onTabSelect={handleTabSelect}>
        <Tab value="details">Details</Tab>
        <Tab value="staff">Staff Members</Tab>
        <Tab value="locations">Locations</Tab>
        <Tab value="equipment">Equipment</Tab>
      </TabList>

      <div className={styles.tabContent}>{renderTabContent()}</div>
    </div>
  )
}
