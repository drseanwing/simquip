import { lazy, Suspense, useState } from 'react'
import {
  Button,
  makeStyles,
  Spinner,
  Tab,
  TabList,
  Text,
  Title3,
  tokens,
} from '@fluentui/react-components'
import { EditRegular } from '@fluentui/react-icons'
import { useNavigate, useParams } from 'react-router-dom'
import {
  MediaType,
  OwnerType,
  parseContentsJson,
  serializeContents,
  parseFlowChartJson,
  serializeFlowChart,
} from '../types'
import type { ContentsItem, EquipmentMedia, FlowChartData } from '../types'
import type { SelectTabData, SelectTabEvent } from '@fluentui/react-components'
import StatusBadge from '../components/StatusBadge'
import ImageGallery from '../components/equipment/ImageGallery'
import ContentsChecklist from '../components/equipment/ContentsChecklist'
import MediaManager from '../components/equipment/MediaManager'
import {
  mockEquipment,
  mockEquipmentMedia,
  mockTeams,
  mockPersons,
  mockLocations,
} from '../services/mockData'

const FlowChartViewer = lazy(() => import('../components/equipment/FlowChartViewer'))
const FlowChartEditor = lazy(() => import('../components/equipment/FlowChartEditor'))

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
  detailsPanel: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: tokens.spacingHorizontalXL,
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '160px 1fr',
    gap: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    alignContent: 'start',
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
  gallerySection: {
    minWidth: 0,
  },
  flowchartToolbar: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: tokens.spacingVerticalS,
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
  const [flowchartEditing, setFlowchartEditing] = useState(false)

  // Local state for mock data mutations
  const [contentsOverride, setContentsOverride] = useState<string | null>(null)
  const [flowchartOverride, setFlowchartOverride] = useState<string | null>(null)
  const [mediaOverride, setMediaOverride] = useState<EquipmentMedia[] | null>(null)

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
          <Title3 as="h1">Equipment Not Found</Title3>
        </div>
        <Text>No equipment found with ID: {id}</Text>
      </div>
    )
  }

  const children = mockEquipment.filter((e) => e.parentEquipmentId === equipment.equipmentId)

  // Resolve current data (with possible local overrides)
  const contentsJson = contentsOverride ?? equipment.contentsListJson
  const contentsItems = parseContentsJson(contentsJson)
  const flowchartJson = flowchartOverride ?? equipment.quickStartFlowChartJson
  const flowchartData = parseFlowChartJson(flowchartJson)

  const equipmentImages = (mediaOverride ?? mockEquipmentMedia)
    .filter((m) => m.equipmentId === equipment.equipmentId && m.mediaType === MediaType.Image)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const equipmentMedia = (mediaOverride ?? mockEquipmentMedia)
    .filter((m) => m.equipmentId === equipment.equipmentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const handleTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    setSelectedTab(data.value as TabValue)
  }

  const handleEdit = () => {
    void navigate(`/equipment/${id}/edit`)
  }

  const handleBack = () => {
    void navigate('/equipment')
  }

  const handleContentsSave = (items: ContentsItem[]) => {
    setContentsOverride(serializeContents(items))
  }

  const handleFlowchartSave = (data: FlowChartData) => {
    setFlowchartOverride(serializeFlowChart(data))
    setFlowchartEditing(false)
  }

  const handleMediaChange = (media: EquipmentMedia[]) => {
    // Merge: keep non-equipment media, replace equipment media
    const otherMedia = (mediaOverride ?? mockEquipmentMedia).filter(
      (m) => m.equipmentId !== equipment.equipmentId,
    )
    setMediaOverride([...otherMedia, ...media])
  }

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'details':
        return (
          <div className={styles.detailsPanel}>
            <div className={styles.infoGrid}>
              <Text className={styles.label}>Owner</Text>
              <Text>
                {getOwnerDisplay(
                  equipment.ownerType,
                  equipment.ownerTeamId,
                  equipment.ownerPersonId,
                )}
              </Text>
              <Text className={styles.label}>Contact Person</Text>
              <Text>{getPersonName(equipment.contactPersonId)}</Text>
              <Text className={styles.label}>Home Location</Text>
              <Text>{getLocationName(equipment.homeLocationId)}</Text>
              <Text className={styles.label}>Description</Text>
              <Text>{equipment.description || 'No description.'}</Text>
            </div>
            <div className={styles.gallerySection}>
              <ImageGallery images={equipmentImages} />
            </div>
          </div>
        )
      case 'contents':
        return <ContentsChecklist items={contentsItems} onSave={handleContentsSave} />
      case 'quickstart':
        return (
          <Suspense fallback={<Spinner label="Loading flowchart..." />}>
            {flowchartEditing ? (
              <FlowChartEditor
                data={flowchartData}
                onSave={handleFlowchartSave}
                onCancel={() => setFlowchartEditing(false)}
              />
            ) : (
              <>
                <div className={styles.flowchartToolbar}>
                  <Button icon={<EditRegular />} onClick={() => setFlowchartEditing(true)}>
                    Edit Flowchart
                  </Button>
                </div>
                <FlowChartViewer data={flowchartData} />
              </>
            )}
          </Suspense>
        )
      case 'media':
        return <MediaManager media={equipmentMedia} onMediaChange={handleMediaChange} />
      case 'children':
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
      case 'loans':
        return <Text className={styles.placeholder}>No loan history.</Text>
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
