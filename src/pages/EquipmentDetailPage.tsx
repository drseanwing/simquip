import {
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
import { OwnerType } from '../types'
import StatusBadge from '../components/StatusBadge'
import { mockEquipment, mockTeams, mockPersons, mockLocations } from '../services/mockData'
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
  childList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  childItem: {
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
  contentsBlock: {
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
})

type TabValue = 'details' | 'contents' | 'quickstart' | 'media' | 'children' | 'loans'

function getOwnerDisplay(
  ownerType: string,
  ownerTeamId: string | null,
  ownerPersonId: string | null,
): string {
  if (ownerType === OwnerType.Team && ownerTeamId) {
    const team = mockTeams.find((t) => t.teamId === ownerTeamId)
    return team ? `${team.name} (Team)` : 'Unknown Team'
  }
  if (ownerType === OwnerType.Person && ownerPersonId) {
    const person = mockPersons.find((p) => p.personId === ownerPersonId)
    return person ? `${person.displayName} (Person)` : 'Unknown Person'
  }
  return 'Unassigned'
}

function getPersonName(personId: string): string {
  const person = mockPersons.find((p) => p.personId === personId)
  return person?.displayName ?? 'Unknown'
}

function getLocationName(locationId: string): string {
  const loc = mockLocations.find((l) => l.locationId === locationId)
  return loc?.name ?? 'Unknown'
}

export default function EquipmentDetailPage() {
  const styles = useStyles()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [selectedTab, setSelectedTab] = useState<TabValue>('details')

  if (!id) {
    return <Text>Invalid URL</Text>
  }

  const equipment = mockEquipment.find((e) => e.equipmentId === id)

  if (!equipment) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <Button appearance="subtle" onClick={() => void navigate('/equipment')}>
            Back
          </Button>
          <Title2 as="h1">Equipment Not Found</Title2>
        </div>
        <Text>No equipment found with ID: {id}</Text>
      </div>
    )
  }

  const children = mockEquipment.filter((e) => e.parentEquipmentId === equipment.equipmentId)

  const handleTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    setSelectedTab(data.value as TabValue)
  }

  const handleEdit = () => {
    void navigate(`/equipment/${id}/edit`)
  }

  const handleBack = () => {
    void navigate('/equipment')
  }

  const renderContents = () => {
    if (!equipment.contentsListJson || equipment.contentsListJson === '[]') {
      return <Text className={styles.placeholder}>No contents listed.</Text>
    }
    try {
      const parsed: unknown = JSON.parse(equipment.contentsListJson)
      const contents = Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : []
      if (contents.length > 0) {
        return (
          <div className={styles.contentsBlock}>
            {contents.map((item, index) => (
              <div key={index}>{item}</div>
            ))}
          </div>
        )
      }
      return <Text className={styles.placeholder}>No contents listed.</Text>
    } catch {
      return <div className={styles.contentsBlock}>{equipment.contentsListJson}</div>
    }
  }

  const renderQuickStart = () => {
    if (!equipment.quickStartFlowChartJson || equipment.quickStartFlowChartJson === '{}') {
      return <Text className={styles.placeholder}>No quick start flow chart configured.</Text>
    }
    return <div className={styles.contentsBlock}>{equipment.quickStartFlowChartJson}</div>
  }

  const renderMedia = () => {
    return <Text className={styles.placeholder}>No images or attachments.</Text>
  }

  const renderChildren = () => {
    if (children.length === 0) {
      return <Text className={styles.placeholder}>No nested equipment.</Text>
    }
    return (
      <div className={styles.childList}>
        {children.map((child) => (
          <div
            key={child.equipmentId}
            className={styles.childItem}
            onClick={() => void navigate(`/equipment/${child.equipmentId}`)}
          >
            <Text weight="semibold">{child.equipmentCode}</Text>
            <Text>{child.name}</Text>
            <StatusBadge status={child.status} />
          </div>
        ))}
      </div>
    )
  }

  const renderLoans = () => {
    return <Text className={styles.placeholder}>No loan history.</Text>
  }

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'details':
        return (
          <div className={styles.infoGrid}>
            <Text className={styles.label}>Owner</Text>
            <Text>
              {getOwnerDisplay(equipment.ownerType, equipment.ownerTeamId, equipment.ownerPersonId)}
            </Text>
            <Text className={styles.label}>Contact Person</Text>
            <Text>{getPersonName(equipment.contactPersonId)}</Text>
            <Text className={styles.label}>Home Location</Text>
            <Text>{getLocationName(equipment.homeLocationId)}</Text>
            <Text className={styles.label}>Description</Text>
            <Text>{equipment.description || 'No description.'}</Text>
          </div>
        )
      case 'contents':
        return renderContents()
      case 'quickstart':
        return renderQuickStart()
      case 'media':
        return renderMedia()
      case 'children':
        return renderChildren()
      case 'loans':
        return renderLoans()
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
        <Title3 as="h1">{equipment.name}</Title3>
        <Text>({equipment.equipmentCode})</Text>
        <StatusBadge status={equipment.status} />
        <div className={styles.headerActions}>
          <Button appearance="primary" onClick={handleEdit}>
            Edit
          </Button>
        </div>
      </div>

      <TabList selectedValue={selectedTab} onTabSelect={handleTabSelect}>
        <Tab value="details">Details</Tab>
        <Tab value="contents">Contents</Tab>
        <Tab value="quickstart">Quick Start</Tab>
        <Tab value="media">Media</Tab>
        <Tab value="children">Child Equipment</Tab>
        <Tab value="loans">Loan History</Tab>
      </TabList>

      <div className={styles.tabContent}>{renderTabContent()}</div>
    </div>
  )
}
