import {
  Badge,
  Button,
  makeStyles,
  Tab,
  TabList,
  Text,
  Title2,
  Title3,
  tokens,
} from '@fluentui/react-components'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  mockTeams,
  mockPersons,
  mockLocations,
  mockTeamMembers,
  mockEquipment,
} from '../services/mockData'
import { OwnerType } from '../types'
import StatusBadge from '../components/StatusBadge'
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

function getPersonName(personId: string): string {
  const person = mockPersons.find((p) => p.personId === personId)
  return person?.displayName ?? 'Unknown'
}

function getPersonEmail(personId: string): string {
  const person = mockPersons.find((p) => p.personId === personId)
  return person?.email ?? ''
}

function getLocationName(locationId: string): string {
  const loc = mockLocations.find((l) => l.locationId === locationId)
  return loc?.name ?? 'Unknown'
}

export default function TeamDetailPage() {
  const styles = useStyles()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [selectedTab, setSelectedTab] = useState<TabValue>('details')

  if (!id) {
    return <Text>Invalid URL</Text>
  }

  const team = mockTeams.find((t) => t.teamId === id)

  if (!team) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <Button appearance="subtle" onClick={() => void navigate('/teams')}>
            Back
          </Button>
          <Title2 as="h1">Team Not Found</Title2>
        </div>
        <Text>No team found with ID: {id}</Text>
      </div>
    )
  }

  const teamMembers = mockTeamMembers.filter((tm) => tm.teamId === team.teamId)

  const teamEquipment = mockEquipment.filter(
    (e) => e.ownerType === OwnerType.Team && e.ownerTeamId === team.teamId,
  )

  // Gather unique location IDs: main location plus home locations of team-owned equipment
  const teamLocationIds = new Set<string>()
  teamLocationIds.add(team.mainLocationId)
  teamEquipment.forEach((e) => {
    if (e.homeLocationId) {
      teamLocationIds.add(e.homeLocationId)
    }
  })
  const teamLocations = mockLocations.filter((l) => teamLocationIds.has(l.locationId))

  const handleTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    setSelectedTab(data.value as TabValue)
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
      <Text>{getPersonName(team.mainContactPersonId)}</Text>
      <Text className={styles.label}>Main Location</Text>
      <Text>{getLocationName(team.mainLocationId)}</Text>
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
            <Text weight="semibold">{getPersonName(tm.personId)}</Text>
            <Text>{getPersonEmail(tm.personId)}</Text>
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
