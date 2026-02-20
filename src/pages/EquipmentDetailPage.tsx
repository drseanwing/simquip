import { lazy, Suspense, useState, useCallback } from 'react'
import {
  Button,
  Field,
  Input,
  makeStyles,
  Radio,
  RadioGroup,
  Select,
  Spinner,
  Tab,
  TabList,
  Text,
  Textarea,
  Title3,
  tokens,
} from '@fluentui/react-components'
import {
  EditRegular,
  SaveRegular,
  DismissRegular,
  PlayRegular,
} from '@fluentui/react-icons'
import { useNavigate, useParams } from 'react-router-dom'
import {
  EquipmentStatus,
  IssueStatus,
  IssuePriority,
  PMStatus,
  MediaType,
  OwnerType,
  parseContentsJson,
  serializeContents,
  parseFlowChartJson,
  serializeFlowChart,
} from '../types'
import type { ContentsItem, Equipment, EquipmentMedia, EquipmentIssue, FlowChartData, Person, PMTask, Team, Location } from '../types'
import type { SelectTabData, SelectTabEvent } from '@fluentui/react-components'
import StatusBadge from '../components/StatusBadge'
import ImageGallery from '../components/equipment/ImageGallery'
import ContentsChecklist from '../components/equipment/ContentsChecklist'
import MediaManager from '../components/equipment/MediaManager'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import { useServices } from '../contexts/ServiceContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { useAuth, canEditEquipment } from '../contexts/AuthContext'
import { validateEquipment } from '../services/validators'

const FlowChartViewer = lazy(() => import('../components/equipment/FlowChartViewer'))
const FlowChartEditor = lazy(() => import('../components/equipment/FlowChartEditor'))
const FlowChartWizard = lazy(() => import('../components/equipment/FlowChartWizard'))

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
    gap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalS,
  },
  editForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    maxWidth: '640px',
  },
  editActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalM,
  },
  errorText: {
    color: tokens.colorPaletteRedForeground1,
  },
})

type TabValue = 'details' | 'contents' | 'quickstart' | 'media' | 'children' | 'issues' | 'maintenance' | 'loans'

function getOwnerDisplay(
  ownerType: string,
  ownerTeamId: string | null,
  ownerPersonId: string | null,
  teams: Team[],
  persons: Person[],
): string {
  if (ownerType === OwnerType.Team && ownerTeamId) {
    const team = teams.find((t) => t.teamId === ownerTeamId)
    return team ? `${team.name} (Team)` : 'Unknown Team'
  }
  if (ownerType === OwnerType.Person && ownerPersonId) {
    const person = persons.find((p) => p.personId === ownerPersonId)
    return person ? `${person.displayName} (Person)` : 'Unknown Person'
  }
  return 'Unassigned'
}

function getPersonName(personId: string, persons: Person[]): string {
  const person = persons.find((p) => p.personId === personId)
  return person?.displayName ?? 'Unknown'
}

function getLocationName(locationId: string, locations: Location[]): string {
  const loc = locations.find((l) => l.locationId === locationId)
  return loc?.name ?? 'Unknown'
}

export default function EquipmentDetailPage() {
  const styles = useStyles()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const {
    equipmentService,
    equipmentMediaService,
    teamService,
    personService,
    locationService,
    equipmentIssueService,
    pmTaskService,
    pmTemplateService,
  } = useServices()
  const [selectedTab, setSelectedTab] = useState<TabValue>('details')
  const [flowchartEditing, setFlowchartEditing] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)

  // Inline edit state for details tab
  const [detailsEditing, setDetailsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editOwnerType, setEditOwnerType] = useState<OwnerType>(OwnerType.Team)
  const [editOwnerTeamId, setEditOwnerTeamId] = useState('')
  const [editOwnerPersonId, setEditOwnerPersonId] = useState('')
  const [editContactPersonId, setEditContactPersonId] = useState('')
  const [editHomeLocationId, setEditHomeLocationId] = useState('')
  const [editStatus, setEditStatus] = useState<EquipmentStatus>(EquipmentStatus.Available)
  const [editErrors, setEditErrors] = useState<Array<{ field?: string; message: string }>>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [contentsOverride, setContentsOverride] = useState<string | null>(null)
  const [flowchartOverride, setFlowchartOverride] = useState<string | null>(null)

  const fetcher = useCallback(async () => {
    if (!id) throw new Error('Invalid URL')
    const sanitizedId = id.replace(/'/g, "''")
    const [equipment, allEquipment, media, teams, persons, locations, issues, pmTasks, pmTemplates] = await Promise.all([
      equipmentService.getById(id),
      equipmentService.getAll({ top: 5000 }),
      equipmentMediaService.getAll({ top: 500, filter: `equipmentId eq '${sanitizedId}'` }),
      teamService.getAll({ top: 500 }),
      personService.getAll({ top: 500 }),
      locationService.getAll({ top: 500 }),
      equipmentIssueService.getAll({ top: 500, filter: `equipmentId eq '${sanitizedId}'` }),
      pmTaskService.getAll({ top: 500, filter: `equipmentId eq '${sanitizedId}'` }),
      pmTemplateService.getAll({ top: 500, filter: `equipmentId eq '${sanitizedId}'` }),
    ])
    const children = allEquipment.data.filter((e) => e.parentEquipmentId === id)
    return {
      equipment,
      children,
      media: media.data,
      teams: teams.data,
      persons: persons.data,
      locations: locations.data,
      issues: issues.data,
      pmTasks: pmTasks.data,
      pmTemplates: pmTemplates.data,
    }
  }, [id, equipmentService, equipmentMediaService, teamService, personService, locationService, equipmentIssueService, pmTaskService, pmTemplateService])

  const { data, loading, error, reload } = useAsyncData(fetcher, [id])

  if (!id) return <Text>Invalid URL</Text>
  if (loading) return <LoadingState />
  if (error || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <Button appearance="subtle" onClick={() => void navigate('/equipment')}>
            Back
          </Button>
          <Title3 as="h1">Equipment Not Found</Title3>
        </div>
        <ErrorState message={error ?? 'Equipment not found'} onRetry={reload} />
      </div>
    )
  }

  const { equipment, children } = data
  const canEdit = canEditEquipment(user, equipment.ownerPersonId, equipment.ownerTeamId)

  const contentsJson = contentsOverride ?? equipment.contentsListJson
  const contentsItems = parseContentsJson(contentsJson)
  const flowchartJson = flowchartOverride ?? equipment.quickStartFlowChartJson
  const flowchartData = parseFlowChartJson(flowchartJson)

  const equipmentImages = data.media
    .filter((m) => m.equipmentId === equipment.equipmentId && m.mediaType === MediaType.Image)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const equipmentMedia = data.media
    .filter((m) => m.equipmentId === equipment.equipmentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const handleTabSelect = (_event: SelectTabEvent, tabData: SelectTabData) => {
    setSelectedTab(tabData.value as TabValue)
  }

  const handleBack = () => {
    void navigate('/equipment')
  }

  // --- Details inline editing ---
  const startDetailsEdit = () => {
    setEditName(equipment.name)
    setEditCode(equipment.equipmentCode)
    setEditDescription(equipment.description)
    setEditOwnerType(equipment.ownerType)
    setEditOwnerTeamId(equipment.ownerTeamId ?? '')
    setEditOwnerPersonId(equipment.ownerPersonId ?? '')
    setEditContactPersonId(equipment.contactPersonId)
    setEditHomeLocationId(equipment.homeLocationId)
    setEditStatus(equipment.status)
    setEditErrors([])
    setSaveError(null)
    setDetailsEditing(true)
  }

  const cancelDetailsEdit = () => {
    setDetailsEditing(false)
    setEditErrors([])
    setSaveError(null)
  }

  const handleDetailsSave = async () => {
    if (saving) return
    const patch: Partial<Equipment> = {
      equipmentId: equipment.equipmentId,
      name: editName.trim(),
      equipmentCode: editCode.trim(),
      description: editDescription.trim(),
      ownerType: editOwnerType,
      ownerTeamId: editOwnerType === OwnerType.Team ? editOwnerTeamId || null : null,
      ownerPersonId: editOwnerType === OwnerType.Person ? editOwnerPersonId || null : null,
      contactPersonId: editContactPersonId || '',
      homeLocationId: editHomeLocationId || '',
      status: editStatus,
      parentEquipmentId: equipment.parentEquipmentId,
      keyImageUrl: equipment.keyImageUrl,
      quickStartFlowChartJson: equipment.quickStartFlowChartJson,
      contentsListJson: equipment.contentsListJson,
      active: equipment.active,
    }

    const validationErrors = validateEquipment(patch)
    if (validationErrors.length > 0) {
      setEditErrors(validationErrors.map((e) => ({ field: e.field, message: e.message })))
      return
    }

    setSaving(true)
    setSaveError(null)
    try {
      await equipmentService.update(id, patch)
      setDetailsEditing(false)
      reload()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleOwnerTypeChange = (value: string) => {
    const ot = value as OwnerType
    setEditOwnerType(ot)
    if (ot === OwnerType.Team) setEditOwnerPersonId('')
    else setEditOwnerTeamId('')
  }

  const getFieldError = (fieldName: string): string | undefined => {
    return editErrors.find((e) => e.field === fieldName)?.message
  }

  // --- Contents ---
  const handleContentsSave = (items: ContentsItem[]) => {
    const json = serializeContents(items)
    setContentsOverride(json)
    void equipmentService.update(id, { contentsListJson: json })
  }

  // --- Flowchart ---
  const handleFlowchartSave = (flowData: FlowChartData) => {
    const json = serializeFlowChart(flowData)
    setFlowchartOverride(json)
    setFlowchartEditing(false)
    void equipmentService.update(id, { quickStartFlowChartJson: json })
  }

  // --- Media persistence ---
  const handleMediaChange = async (updatedMedia: EquipmentMedia[]) => {
    // Find newly added media (local IDs start with 'em-local-')
    const newMedia = updatedMedia.filter((m) => m.equipmentMediaId.startsWith('em-local-'))
    // Find deleted media
    const existingIds = new Set(updatedMedia.map((m) => m.equipmentMediaId))
    const deletedMedia = data.media.filter((m) => !existingIds.has(m.equipmentMediaId))

    // Persist new media records to Dataverse
    for (const m of newMedia) {
      try {
        await equipmentMediaService.create({
          equipmentId: equipment.equipmentId,
          mediaType: m.mediaType,
          fileName: m.fileName,
          mimeType: m.mimeType,
          fileUrl: m.fileUrl,
          sortOrder: m.sortOrder,
        } as Partial<EquipmentMedia>)
      } catch {
        // Continue with other media even if one fails
      }
    }

    // Delete removed media from Dataverse
    for (const m of deletedMedia) {
      try {
        await equipmentMediaService.delete(m.equipmentMediaId)
      } catch {
        // Continue
      }
    }

    // Reload to get server-assigned IDs
    reload()
  }

  const activeTeams = data.teams.filter((t) => t.active)
  const activePersons = data.persons.filter((p) => p.active)

  const renderDetailsView = () => (
    <div className={styles.detailsPanel}>
      <div className={styles.infoGrid}>
        <Text className={styles.label}>Owner</Text>
        <Text>
          {getOwnerDisplay(
            equipment.ownerType,
            equipment.ownerTeamId,
            equipment.ownerPersonId,
            data.teams,
            data.persons,
          )}
        </Text>
        <Text className={styles.label}>Contact Person</Text>
        <Text>{getPersonName(equipment.contactPersonId, data.persons)}</Text>
        <Text className={styles.label}>Home Location</Text>
        <Text>{getLocationName(equipment.homeLocationId, data.locations)}</Text>
        <Text className={styles.label}>Description</Text>
        <Text>{equipment.description || 'No description.'}</Text>
      </div>
      <div className={styles.gallerySection}>
        <ImageGallery images={equipmentImages} />
      </div>
    </div>
  )

  const renderDetailsEdit = () => (
    <div className={styles.editForm}>
      {saveError && <Text className={styles.errorText}>{saveError}</Text>}

      <Field label="Name" required validationMessage={getFieldError('name')} validationState={getFieldError('name') ? 'error' : 'none'}>
        <Input value={editName} onChange={(_, d) => setEditName(d.value)} />
      </Field>

      <Field label="Equipment Code" required validationMessage={getFieldError('equipmentCode')} validationState={getFieldError('equipmentCode') ? 'error' : 'none'}>
        <Input value={editCode} onChange={(_, d) => setEditCode(d.value)} />
      </Field>

      <Field label="Description">
        <Textarea value={editDescription} onChange={(_, d) => setEditDescription(d.value)} />
      </Field>

      <Field label="Owner Type" required>
        <RadioGroup value={editOwnerType} onChange={(_, d) => handleOwnerTypeChange(d.value)} layout="horizontal">
          <Radio value={OwnerType.Team} label="Team" />
          <Radio value={OwnerType.Person} label="Person" />
        </RadioGroup>
      </Field>

      {editOwnerType === OwnerType.Team && (
        <Field label="Owner Team" required validationMessage={getFieldError('ownerTeamId')} validationState={getFieldError('ownerTeamId') ? 'error' : 'none'}>
          <Select value={editOwnerTeamId} onChange={(_, d) => setEditOwnerTeamId(d.value)}>
            <option value="">-- Select a team --</option>
            {activeTeams.map((team) => (
              <option key={team.teamId} value={team.teamId}>{team.name}</option>
            ))}
          </Select>
        </Field>
      )}

      {editOwnerType === OwnerType.Person && (
        <Field label="Owner Person" required validationMessage={getFieldError('ownerPersonId')} validationState={getFieldError('ownerPersonId') ? 'error' : 'none'}>
          <Select value={editOwnerPersonId} onChange={(_, d) => setEditOwnerPersonId(d.value)}>
            <option value="">-- Select a person --</option>
            {activePersons.map((person) => (
              <option key={person.personId} value={person.personId}>{person.displayName}</option>
            ))}
          </Select>
        </Field>
      )}

      <Field label="Contact Person">
        <Select value={editContactPersonId} onChange={(_, d) => setEditContactPersonId(d.value)}>
          <option value="">-- Select a contact --</option>
          {activePersons.map((person) => (
            <option key={person.personId} value={person.personId}>{person.displayName}</option>
          ))}
        </Select>
      </Field>

      <Field label="Home Location">
        <Select value={editHomeLocationId} onChange={(_, d) => setEditHomeLocationId(d.value)}>
          <option value="">-- Select a location --</option>
          {data.locations.map((loc) => (
            <option key={loc.locationId} value={loc.locationId}>{loc.name}</option>
          ))}
        </Select>
      </Field>

      <Field label="Status" required>
        <Select value={editStatus} onChange={(_, d) => setEditStatus(d.value as EquipmentStatus)}>
          <option value={EquipmentStatus.Available}>Available</option>
          <option value={EquipmentStatus.InUse}>In Use</option>
          <option value={EquipmentStatus.UnderMaintenance}>Under Maintenance</option>
          <option value={EquipmentStatus.Retired}>Retired</option>
        </Select>
      </Field>

      <div className={styles.editActions}>
        <Button
          appearance="primary"
          icon={<SaveRegular />}
          onClick={() => void handleDetailsSave()}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
        <Button icon={<DismissRegular />} onClick={cancelDetailsEdit} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  )

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'details':
        return (
          <>
            {!detailsEditing && canEdit && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: tokens.spacingVerticalM }}>
                <Button appearance="primary" icon={<EditRegular />} onClick={startDetailsEdit}>
                  Edit Details
                </Button>
              </div>
            )}
            {detailsEditing ? renderDetailsEdit() : renderDetailsView()}
          </>
        )
      case 'contents':
        return <ContentsChecklist items={contentsItems} onSave={handleContentsSave} readOnly={!canEdit} />
      case 'quickstart':
        return (
          <Suspense fallback={<Spinner label="Loading flowchart..." />}>
            {wizardOpen ? (
              <FlowChartWizard data={flowchartData} onClose={() => setWizardOpen(false)} />
            ) : flowchartEditing ? (
              <FlowChartEditor
                data={flowchartData}
                onSave={handleFlowchartSave}
                onCancel={() => setFlowchartEditing(false)}
              />
            ) : (
              <>
                <div className={styles.flowchartToolbar}>
                  {flowchartData && flowchartData.nodes.length > 0 && (
                    <Button icon={<PlayRegular />} onClick={() => setWizardOpen(true)}>
                      Run Wizard
                    </Button>
                  )}
                  {canEdit && (
                    <Button icon={<EditRegular />} onClick={() => setFlowchartEditing(true)}>
                      Edit Flowchart
                    </Button>
                  )}
                </div>
                <FlowChartViewer data={flowchartData} />
              </>
            )}
          </Suspense>
        )
      case 'media':
        return <MediaManager media={equipmentMedia} onMediaChange={(m) => void handleMediaChange(m)} readOnly={!canEdit} />
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
      case 'issues':
        if (data.issues.length === 0) {
          return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacingVerticalM }}>
                <Text className={styles.placeholder}>No issues reported.</Text>
                <Button appearance="primary" onClick={() => void navigate(`/issues/new?equipmentId=${id}`)}>
                  Report Issue
                </Button>
              </div>
            </div>
          )
        }
        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: tokens.spacingVerticalM }}>
              <Button appearance="primary" onClick={() => void navigate(`/issues/new?equipmentId=${id}`)}>
                Report Issue
              </Button>
            </div>
            <div className={styles.childList}>
              {data.issues
                .sort((a: EquipmentIssue, b: EquipmentIssue) => b.createdOn.localeCompare(a.createdOn))
                .map((issue: EquipmentIssue) => (
                <div
                  key={issue.issueId}
                  className={styles.childItem}
                  onClick={() => void navigate(`/issues/${issue.issueId}`)}
                >
                  <Text weight="semibold">{issue.title}</Text>
                  <Text size={200} style={{ color: issue.priority === IssuePriority.Critical ? tokens.colorPaletteRedForeground1 : issue.priority === IssuePriority.High ? tokens.colorPaletteDarkOrangeForeground1 : undefined }}>
                    {issue.priority}
                  </Text>
                  <Text size={200}>{issue.status}</Text>
                  <Text size={200}>Due: {issue.dueDate}</Text>
                </div>
              ))}
            </div>
          </div>
        )
      case 'maintenance':
        if (data.pmTasks.length === 0 && data.pmTemplates.length === 0) {
          return (
            <div>
              <Text className={styles.placeholder}>No preventative maintenance scheduled.</Text>
              <div style={{ marginTop: tokens.spacingVerticalM }}>
                <Button appearance="primary" onClick={() => void navigate(`/maintenance/new?equipmentId=${id}`)}>
                  Schedule PM
                </Button>
              </div>
            </div>
          )
        }
        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: tokens.spacingVerticalM }}>
              <Button appearance="primary" onClick={() => void navigate(`/maintenance/new?equipmentId=${id}`)}>
                Schedule PM
              </Button>
            </div>
            {data.pmTemplates.length > 0 && (
              <div style={{ marginBottom: tokens.spacingVerticalL }}>
                <Text weight="semibold" size={400}>PM Templates</Text>
                <div className={styles.childList} style={{ marginTop: tokens.spacingVerticalS }}>
                  {data.pmTemplates.map((tmpl) => (
                    <div key={tmpl.pmTemplateId} className={styles.childItem}>
                      <Text weight="semibold">{tmpl.name}</Text>
                      <Text size={200}>{tmpl.frequency}</Text>
                      <Text size={200}>{tmpl.active ? 'Active' : 'Inactive'}</Text>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {data.pmTasks.length > 0 && (
              <div>
                <Text weight="semibold" size={400}>PM Tasks</Text>
                <div className={styles.childList} style={{ marginTop: tokens.spacingVerticalS }}>
                  {data.pmTasks
                    .sort((a: PMTask, b: PMTask) => b.scheduledDate.localeCompare(a.scheduledDate))
                    .map((task: PMTask) => (
                    <div
                      key={task.pmTaskId}
                      className={styles.childItem}
                      onClick={() => void navigate(`/maintenance/${task.pmTaskId}`)}
                    >
                      <Text weight="semibold">Scheduled: {task.scheduledDate}</Text>
                      <Text size={200} style={{
                        color: task.status === PMStatus.Overdue ? tokens.colorPaletteRedForeground1
                          : task.status === PMStatus.Completed ? tokens.colorPaletteGreenForeground1
                          : undefined
                      }}>
                        {task.status}
                      </Text>
                      {task.completedDate && <Text size={200}>Completed: {task.completedDate}</Text>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
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
      </div>

      <TabList selectedValue={selectedTab} onTabSelect={handleTabSelect}>
        <Tab value="details">Details</Tab>
        <Tab value="contents">Contents</Tab>
        <Tab value="quickstart">Quick Start</Tab>
        <Tab value="media">Media</Tab>
        <Tab value="children">Child Equipment</Tab>
        <Tab value="issues">Issues{data.issues.length > 0 ? ` (${data.issues.length})` : ''}</Tab>
        <Tab value="maintenance">Maintenance{data.pmTasks.length > 0 ? ` (${data.pmTasks.length})` : ''}</Tab>
        <Tab value="loans">Loan History</Tab>
      </TabList>

      <div className={styles.tabContent}>{renderTabContent()}</div>
    </div>
  )
}
