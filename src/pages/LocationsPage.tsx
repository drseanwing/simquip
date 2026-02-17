import { useState, useMemo, useCallback } from 'react'
import {
  Button,
  Card,
  Field,
  Input,
  makeStyles,
  Select,
  Text,
  Title2,
  Title3,
  tokens,
} from '@fluentui/react-components'
import { useNavigate } from 'react-router-dom'
import type { Building, Level, Location } from '../types'
import {
  mockBuildings,
  mockLevels,
  mockLocations,
  mockEquipment,
  mockPersons,
} from '../services/mockData'
import { validateLocation } from '../services/validators'

// ── Styles ────────────────────────────────────────────────────────────────────

const useStyles = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  columns: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: tokens.spacingHorizontalL,
    alignItems: 'start',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  columnHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: tokens.spacingVerticalS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.spacingVerticalS,
    cursor: 'pointer',
    borderRadius: tokens.borderRadiusMedium,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  listItemSelected: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.spacingVerticalS,
    cursor: 'pointer',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorBrandBackground2,
  },
  listItemContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  badge: {
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusCircular,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    fontSize: tokens.fontSizeBase200,
  },
  emptyState: {
    color: tokens.colorNeutralForeground3,
    fontStyle: 'italic',
    padding: tokens.spacingVerticalM,
  },
  detailCard: {
    marginTop: tokens.spacingVerticalL,
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: '140px 1fr',
    gap: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    maxWidth: '600px',
  },
  label: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
  },
  inlineForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  formActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
  },
  equipmentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingVerticalXS,
    cursor: 'pointer',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
})

// ── Helper Functions ──────────────────────────────────────────────────────────

function getPersonName(personId: string): string {
  const person = mockPersons.find((p) => p.personId === personId)
  return person?.displayName ?? 'Unknown'
}

function getEquipmentCountForLocation(locationId: string): number {
  return mockEquipment.filter((e) => e.homeLocationId === locationId).length
}

// ── Inline Forms ──────────────────────────────────────────────────────────────

interface BuildingFormProps {
  onSave: (building: Building) => void
  onCancel: () => void
}

function BuildingForm({ onSave, onCancel }: BuildingFormProps) {
  const styles = useStyles()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const handleSave = () => {
    if (!name.trim() || !code.trim()) {
      setError('Name and code are required.')
      return
    }
    setError('')
    onSave({
      buildingId: crypto.randomUUID(),
      name: name.trim(),
      code: code.trim(),
    })
  }

  return (
    <div className={styles.inlineForm}>
      <Field label="Name" required validationMessage={error || undefined}>
        <Input
          value={name}
          onChange={(_e, data) => setName(data.value)}
          placeholder="Building name"
        />
      </Field>
      <Field label="Code" required>
        <Input value={code} onChange={(_e, data) => setCode(data.value)} placeholder="e.g. MEC" />
      </Field>
      <div className={styles.formActions}>
        <Button appearance="primary" size="small" onClick={handleSave}>
          Save
        </Button>
        <Button appearance="secondary" size="small" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

interface LevelFormProps {
  buildingId: string
  onSave: (level: Level) => void
  onCancel: () => void
  existingLevels: Level[]
}

function LevelForm({ buildingId, onSave, onCancel, existingLevels }: LevelFormProps) {
  const styles = useStyles()
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleSave = () => {
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    setError('')
    const maxSort = existingLevels.reduce((max, l) => Math.max(max, l.sortOrder), -1)
    onSave({
      levelId: crypto.randomUUID(),
      buildingId,
      name: name.trim(),
      sortOrder: maxSort + 1,
    })
  }

  return (
    <div className={styles.inlineForm}>
      <Field label="Level Name" required validationMessage={error || undefined}>
        <Input
          value={name}
          onChange={(_e, data) => setName(data.value)}
          placeholder="e.g. Ground Floor"
        />
      </Field>
      <div className={styles.formActions}>
        <Button appearance="primary" size="small" onClick={handleSave}>
          Save
        </Button>
        <Button appearance="secondary" size="small" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

interface LocationFormProps {
  buildingId: string
  levelId: string
  onSave: (location: Location) => void
  onCancel: () => void
}

function LocationForm({ buildingId, levelId, onSave, onCancel }: LocationFormProps) {
  const styles = useStyles()
  const [name, setName] = useState('')
  const [contactPersonId, setContactPersonId] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<Array<{ field?: string; message: string }>>([])

  const activePersons = mockPersons.filter((p) => p.active)

  const getFieldError = (fieldName: string): string | undefined => {
    const err = errors.find((e) => e.field === fieldName)
    return err?.message
  }

  const handleSave = () => {
    const location: Partial<Location> = {
      name: name.trim(),
      buildingId,
      levelId,
      contactPersonId: contactPersonId || '',
      description: description.trim(),
    }
    const validationErrors = validateLocation(location)
    if (validationErrors.length > 0) {
      setErrors(validationErrors.map((e) => ({ field: e.field, message: e.message })))
      return
    }
    setErrors([])
    onSave({
      locationId: crypto.randomUUID(),
      buildingId,
      levelId,
      name: name.trim(),
      contactPersonId: contactPersonId || '',
      description: description.trim(),
    })
  }

  return (
    <div className={styles.inlineForm}>
      <Field
        label="Location Name"
        required
        validationMessage={getFieldError('name')}
        validationState={getFieldError('name') ? 'error' : 'none'}
      >
        <Input
          value={name}
          onChange={(_e, data) => setName(data.value)}
          placeholder="e.g. Simulation Laboratory"
        />
      </Field>
      <Field label="Contact Person">
        <Select value={contactPersonId} onChange={(_e, data) => setContactPersonId(data.value)}>
          <option value="">-- Select a contact --</option>
          {activePersons.map((person) => (
            <option key={person.personId} value={person.personId}>
              {person.displayName}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Description">
        <Input
          value={description}
          onChange={(_e, data) => setDescription(data.value)}
          placeholder="Description"
        />
      </Field>
      <div className={styles.formActions}>
        <Button appearance="primary" size="small" onClick={handleSave}>
          Save
        </Button>
        <Button appearance="secondary" size="small" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LocationsPage() {
  const styles = useStyles()
  const navigate = useNavigate()

  // Local state copies of mock data (allows inline add to reflect immediately)
  const [buildings, setBuildings] = useState<Building[]>(mockBuildings)
  const [levels, setLevels] = useState<Level[]>(mockLevels)
  const [locations, setLocations] = useState<Location[]>(mockLocations)

  // Selection state
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null)
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null)
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)

  // Inline form visibility
  const [showBuildingForm, setShowBuildingForm] = useState(false)
  const [showLevelForm, setShowLevelForm] = useState(false)
  const [showLocationForm, setShowLocationForm] = useState(false)

  // ── Derived data ──────────────────────────────────────────────────────────

  const levelsForBuilding = useMemo(
    () =>
      selectedBuildingId
        ? levels
            .filter((l) => l.buildingId === selectedBuildingId)
            .sort((a, b) => a.sortOrder - b.sortOrder)
        : [],
    [levels, selectedBuildingId],
  )

  const locationsForLevel = useMemo(
    () =>
      selectedBuildingId && selectedLevelId
        ? locations.filter(
            (loc) => loc.buildingId === selectedBuildingId && loc.levelId === selectedLevelId,
          )
        : [],
    [locations, selectedBuildingId, selectedLevelId],
  )

  const selectedLocation = useMemo(
    () =>
      selectedLocationId ? locations.find((l) => l.locationId === selectedLocationId) : undefined,
    [locations, selectedLocationId],
  )

  const equipmentAtLocation = useMemo(
    () =>
      selectedLocationId
        ? mockEquipment.filter((e) => e.homeLocationId === selectedLocationId)
        : [],
    [selectedLocationId],
  )

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectBuilding = useCallback((buildingId: string) => {
    setSelectedBuildingId(buildingId)
    setSelectedLevelId(null)
    setSelectedLocationId(null)
    setShowLevelForm(false)
    setShowLocationForm(false)
  }, [])

  const handleSelectLevel = useCallback((levelId: string) => {
    setSelectedLevelId(levelId)
    setSelectedLocationId(null)
    setShowLocationForm(false)
  }, [])

  const handleSelectLocation = useCallback((locationId: string) => {
    setSelectedLocationId(locationId)
  }, [])

  const handleAddBuilding = useCallback((building: Building) => {
    setBuildings((prev) => [...prev, building])
    setShowBuildingForm(false)
  }, [])

  const handleAddLevel = useCallback((level: Level) => {
    setLevels((prev) => [...prev, level])
    setShowLevelForm(false)
  }, [])

  const handleAddLocation = useCallback((location: Location) => {
    setLocations((prev) => [...prev, location])
    setShowLocationForm(false)
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      <Title2 as="h1">Locations</Title2>

      <div className={styles.columns}>
        {/* ── Buildings Column ────────────────────────────────────────── */}
        <div className={styles.column}>
          <div className={styles.columnHeader}>
            <Title3 as="h2">Buildings</Title3>
            <Button
              appearance="primary"
              size="small"
              onClick={() => setShowBuildingForm(true)}
              disabled={showBuildingForm}
            >
              Add
            </Button>
          </div>

          {showBuildingForm && (
            <BuildingForm onSave={handleAddBuilding} onCancel={() => setShowBuildingForm(false)} />
          )}

          {buildings.length === 0 ? (
            <Text className={styles.emptyState}>No buildings defined.</Text>
          ) : (
            buildings.map((building) => {
              const isSelected = building.buildingId === selectedBuildingId
              return (
                <div
                  key={building.buildingId}
                  className={isSelected ? styles.listItemSelected : styles.listItem}
                  onClick={() => handleSelectBuilding(building.buildingId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter') handleSelectBuilding(building.buildingId)
                  }}
                >
                  <div className={styles.listItemContent}>
                    <Text weight="semibold">{building.name}</Text>
                    <Text size={200}>{building.code}</Text>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* ── Levels Column ──────────────────────────────────────────── */}
        <div className={styles.column}>
          <div className={styles.columnHeader}>
            <Title3 as="h2">Levels</Title3>
            <Button
              appearance="primary"
              size="small"
              onClick={() => setShowLevelForm(true)}
              disabled={!selectedBuildingId || showLevelForm}
            >
              Add
            </Button>
          </div>

          {showLevelForm && selectedBuildingId && (
            <LevelForm
              buildingId={selectedBuildingId}
              existingLevels={levelsForBuilding}
              onSave={handleAddLevel}
              onCancel={() => setShowLevelForm(false)}
            />
          )}

          {!selectedBuildingId ? (
            <Text className={styles.emptyState}>Select a building to see levels.</Text>
          ) : levelsForBuilding.length === 0 ? (
            <Text className={styles.emptyState}>No levels for this building.</Text>
          ) : (
            levelsForBuilding.map((level) => {
              const isSelected = level.levelId === selectedLevelId
              return (
                <div
                  key={level.levelId}
                  className={isSelected ? styles.listItemSelected : styles.listItem}
                  onClick={() => handleSelectLevel(level.levelId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter') handleSelectLevel(level.levelId)
                  }}
                >
                  <div className={styles.listItemContent}>
                    <Text weight="semibold">{level.name}</Text>
                    <Text size={200}>Sort order: {level.sortOrder}</Text>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* ── Locations Column ───────────────────────────────────────── */}
        <div className={styles.column}>
          <div className={styles.columnHeader}>
            <Title3 as="h2">Locations</Title3>
            <Button
              appearance="primary"
              size="small"
              onClick={() => setShowLocationForm(true)}
              disabled={!selectedBuildingId || !selectedLevelId || showLocationForm}
            >
              Add
            </Button>
          </div>

          {showLocationForm && selectedBuildingId && selectedLevelId && (
            <LocationForm
              buildingId={selectedBuildingId}
              levelId={selectedLevelId}
              onSave={handleAddLocation}
              onCancel={() => setShowLocationForm(false)}
            />
          )}

          {!selectedLevelId ? (
            <Text className={styles.emptyState}>Select a level to see locations.</Text>
          ) : locationsForLevel.length === 0 ? (
            <Text className={styles.emptyState}>No locations for this level.</Text>
          ) : (
            locationsForLevel.map((loc) => {
              const isSelected = loc.locationId === selectedLocationId
              const equipCount = getEquipmentCountForLocation(loc.locationId)
              return (
                <div
                  key={loc.locationId}
                  className={isSelected ? styles.listItemSelected : styles.listItem}
                  onClick={() => handleSelectLocation(loc.locationId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter') handleSelectLocation(loc.locationId)
                  }}
                >
                  <div className={styles.listItemContent}>
                    <Text weight="semibold">{loc.name}</Text>
                    <Text size={200}>
                      {equipCount} equipment item{equipCount !== 1 ? 's' : ''}
                    </Text>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Location Detail Card ───────────────────────────────────────────── */}
      {selectedLocation && (
        <Card className={styles.detailCard}>
          <Title3 as="h3">{selectedLocation.name}</Title3>
          <div className={styles.detailGrid}>
            <Text className={styles.label}>Building</Text>
            <Text>
              {buildings.find((b) => b.buildingId === selectedLocation.buildingId)?.name ??
                'Unknown'}
            </Text>
            <Text className={styles.label}>Level</Text>
            <Text>
              {levels.find((l) => l.levelId === selectedLocation.levelId)?.name ?? 'Unknown'}
            </Text>
            <Text className={styles.label}>Contact Person</Text>
            <Text>
              {selectedLocation.contactPersonId
                ? getPersonName(selectedLocation.contactPersonId)
                : 'Not assigned'}
            </Text>
            <Text className={styles.label}>Description</Text>
            <Text>{selectedLocation.description || 'No description.'}</Text>
            <Text className={styles.label}>Equipment</Text>
            <Text>
              {equipmentAtLocation.length} item{equipmentAtLocation.length !== 1 ? 's' : ''}
            </Text>
          </div>

          {equipmentAtLocation.length > 0 && (
            <>
              <Title3 as="h4" style={{ marginTop: tokens.spacingVerticalM }}>
                Equipment at this Location
              </Title3>
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
                </div>
              ))}
            </>
          )}

          <Button
            appearance="primary"
            style={{ marginTop: tokens.spacingVerticalM, alignSelf: 'flex-start' }}
            onClick={() => void navigate(`/locations/${selectedLocation.locationId}`)}
          >
            View Details
          </Button>
        </Card>
      )}
    </div>
  )
}
