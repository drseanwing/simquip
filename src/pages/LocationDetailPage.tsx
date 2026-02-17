import { Button, makeStyles, Text, Title2, Title3, tokens } from '@fluentui/react-components'
import { useNavigate, useParams } from 'react-router-dom'
import {
  mockBuildings,
  mockLevels,
  mockLocations,
  mockEquipment,
  mockPersons,
} from '../services/mockData'
import StatusBadge from '../components/StatusBadge'

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
  breadcrumb: {
    color: tokens.colorNeutralForeground3,
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
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  equipmentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  equipmentItem: {
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
  placeholder: {
    color: tokens.colorNeutralForeground3,
    fontStyle: 'italic',
    padding: tokens.spacingVerticalM,
  },
  mediaPlaceholder: {
    color: tokens.colorNeutralForeground3,
    fontStyle: 'italic',
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
  },
})

function getPersonName(personId: string): string {
  const person = mockPersons.find((p) => p.personId === personId)
  return person?.displayName ?? 'Unknown'
}

function getBuildingName(buildingId: string): string {
  const building = mockBuildings.find((b) => b.buildingId === buildingId)
  return building?.name ?? 'Unknown'
}

function getLevelName(levelId: string): string {
  const level = mockLevels.find((l) => l.levelId === levelId)
  return level?.name ?? 'Unknown'
}

export default function LocationDetailPage() {
  const styles = useStyles()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const location = mockLocations.find((l) => l.locationId === id)

  if (!location) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <Button appearance="subtle" onClick={() => void navigate('/locations')}>
            Back
          </Button>
          <Title2 as="h1">Location Not Found</Title2>
        </div>
        <Text>No location found with ID: {id}</Text>
      </div>
    )
  }

  const buildingName = getBuildingName(location.buildingId)
  const levelName = getLevelName(location.levelId)
  const equipmentAtLocation = mockEquipment.filter((e) => e.homeLocationId === location.locationId)

  const handleBack = () => {
    void navigate('/locations')
  }

  const handleEdit = () => {
    // Edit functionality placeholder - navigates back for now
    void navigate('/locations')
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button appearance="subtle" onClick={handleBack}>
          Back
        </Button>
      </div>

      {/* Breadcrumb */}
      <Text className={styles.breadcrumb}>
        {buildingName} &gt; {levelName}
      </Text>

      <div className={styles.titleRow}>
        <Title2 as="h1">{location.name}</Title2>
        <div className={styles.headerActions}>
          <Button appearance="primary" onClick={handleEdit}>
            Edit
          </Button>
        </div>
      </div>

      {/* Details */}
      <div className={styles.infoGrid}>
        <Text className={styles.label}>Building</Text>
        <Text>{buildingName}</Text>
        <Text className={styles.label}>Level</Text>
        <Text>{levelName}</Text>
        <Text className={styles.label}>Contact Person</Text>
        <Text>
          {location.contactPersonId ? getPersonName(location.contactPersonId) : 'Not assigned'}
        </Text>
        <Text className={styles.label}>Description</Text>
        <Text>{location.description || 'No description.'}</Text>
      </div>

      {/* Images / Attachments Placeholder */}
      <div className={styles.section}>
        <Title3 as="h2">Images &amp; Attachments</Title3>
        <Text className={styles.mediaPlaceholder}>
          No images or attachments have been added to this location.
        </Text>
      </div>

      {/* Equipment at this Location */}
      <div className={styles.section}>
        <Title3 as="h2">Equipment at this Location ({equipmentAtLocation.length})</Title3>
        {equipmentAtLocation.length === 0 ? (
          <Text className={styles.placeholder}>No equipment is homed at this location.</Text>
        ) : (
          <div className={styles.equipmentList}>
            {equipmentAtLocation.map((equip) => (
              <div
                key={equip.equipmentId}
                className={styles.equipmentItem}
                onClick={() => void navigate(`/equipment/${equip.equipmentId}`)}
                role="link"
                tabIndex={0}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter') void navigate(`/equipment/${equip.equipmentId}`)
                }}
              >
                <Text weight="semibold">{equip.equipmentCode}</Text>
                <Text>{equip.name}</Text>
                <StatusBadge status={equip.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
