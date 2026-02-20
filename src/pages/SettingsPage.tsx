import { useState, useRef, useEffect } from 'react'
import {
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Field,
  Input,
  makeStyles,
  Select,
  Text,
  Textarea,
  Title2,
  tokens,
} from '@fluentui/react-components'
import { useServices } from '../contexts/ServiceContext'
import { seedAllData, clearAllData } from '../services/seedData'
import { useAsyncData } from '../hooks/useAsyncData'
import type { PMTemplate, PMTemplateItem } from '../types'
import { PMFrequency, IssueStatus, IssuePriority, CorrectiveActionStatus } from '../types'

const useStyles = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    maxWidth: '800px',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingVerticalL,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
  },
  log: {
    maxHeight: '300px',
    overflowY: 'auto',
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingVerticalM,
    fontFamily: 'monospace',
    fontSize: tokens.fontSizeBase200,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  errorText: {
    color: tokens.colorPaletteRedForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  successText: {
    color: tokens.colorPaletteGreenForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  row: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    alignItems: 'end',
  },
  templateItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.spacingVerticalXS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  collapsible: {
    marginTop: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalL,
  },
  enumList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    paddingLeft: tokens.spacingHorizontalL,
  },
  enumSection: {
    marginBottom: tokens.spacingVerticalM,
  },
})

export default function SettingsPage() {
  const styles = useStyles()
  const services = useServices()

  // ── PM Template Management state ──────────────────────────────────────────
  const pmFetcher = async () => {
    const [tplResult, eqResult] = await Promise.all([
      services.pmTemplateService.getAll(),
      services.equipmentService.getAll(),
    ])
    return { templates: tplResult.data, equipment: eqResult.data }
  }
  const {
    data: pmData,
    loading: pmLoading,
    error: pmError,
    reload: reloadTemplates,
  } = useAsyncData(pmFetcher, [])

  const templates = pmData?.templates ?? []
  const equipment = pmData?.equipment ?? []

  const [templateItems, setTemplateItems] = useState<Record<string, PMTemplateItem[]>>({})
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null)
  const [pmActionError, setPmActionError] = useState<string | null>(null)
  const [pmSuccess, setPmSuccess] = useState<string | null>(null)

  // New template form
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newEquipmentId, setNewEquipmentId] = useState('')
  const [newFrequency, setNewFrequency] = useState<string>(PMFrequency.Monthly)
  const [newActive, setNewActive] = useState(true)

  // New checklist item form
  const [newItemDesc, setNewItemDesc] = useState('')
  const [newItemSort, setNewItemSort] = useState('1')

  const loadItemsForTemplate = (templateId: string) => {
    void services.pmTemplateItemService
      .getAll({ filter: `pmTemplateId eq '${templateId}'` })
      .then((result) => {
        setTemplateItems((prev) => ({ ...prev, [templateId]: result.data }))
      })
      .catch(() => {
        // silently fail for item load
      })
  }

  const handleToggleExpand = (templateId: string) => {
    if (expandedTemplateId === templateId) {
      setExpandedTemplateId(null)
    } else {
      setExpandedTemplateId(templateId)
      if (!templateItems[templateId]) {
        loadItemsForTemplate(templateId)
      }
    }
  }

  const [creating, setCreating] = useState(false)

  const handleCreateTemplate = () => {
    if (!newName.trim()) return
    setPmActionError(null)
    setPmSuccess(null)
    setCreating(true)
    void services.pmTemplateService
      .create({
        name: newName.trim(),
        description: newDescription.trim(),
        equipmentId: newEquipmentId || undefined,
        frequency: newFrequency as PMTemplate['frequency'],
        active: newActive,
      } as Partial<PMTemplate>)
      .then(() => {
        setPmSuccess('Template created successfully.')
        setNewName('')
        setNewDescription('')
        setNewEquipmentId('')
        setNewFrequency(PMFrequency.Monthly)
        setNewActive(true)
        setCreating(false)
        reloadTemplates()
      })
      .catch((err: unknown) => {
        setPmActionError(err instanceof Error ? err.message : 'Failed to create template')
        setCreating(false)
      })
  }

  const handleAddItem = (templateId: string) => {
    if (!newItemDesc.trim()) return
    setPmActionError(null)
    void services.pmTemplateItemService
      .create({
        pmTemplateId: templateId,
        description: newItemDesc.trim(),
        sortOrder: parseInt(newItemSort, 10) || 1,
      } as Partial<PMTemplateItem>)
      .then(() => {
        setNewItemDesc('')
        setNewItemSort('1')
        loadItemsForTemplate(templateId)
      })
      .catch((err: unknown) => {
        setPmActionError(err instanceof Error ? err.message : 'Failed to add item')
      })
  }

  const handleDeleteItem = (templateId: string, itemId: string) => {
    setPmActionError(null)
    void services.pmTemplateItemService
      .delete(itemId)
      .then(() => {
        loadItemsForTemplate(templateId)
      })
      .catch((err: unknown) => {
        setPmActionError(err instanceof Error ? err.message : 'Failed to delete item')
      })
  }

  // ── Existing state ────────────────────────────────────────────────────────
  const [seedLog, setSeedLog] = useState<string[]>([])
  const [clearLog, setClearLog] = useState<string[]>([])
  const [previewLog, setPreviewLog] = useState<string[]>([])
  const [seeding, setSeeding] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [seedError, setSeedError] = useState<string | null>(null)
  const [clearError, setClearError] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [showClearDialog, setShowClearDialog] = useState(false)

  const seedLogRef = useRef<HTMLDivElement>(null)
  const clearLogRef = useRef<HTMLDivElement>(null)
  const previewLogRef = useRef<HTMLDivElement>(null)

  const busy = seeding || clearing || previewing

  useEffect(() => {
    if (seedLogRef.current) {
      seedLogRef.current.scrollTop = seedLogRef.current.scrollHeight
    }
  }, [seedLog])

  useEffect(() => {
    if (clearLogRef.current) {
      clearLogRef.current.scrollTop = clearLogRef.current.scrollHeight
    }
  }, [clearLog])

  useEffect(() => {
    if (previewLogRef.current) {
      previewLogRef.current.scrollTop = previewLogRef.current.scrollHeight
    }
  }, [previewLog])

  const handleSeed = () => {
    setSeeding(true)
    setSeedLog([])
    setSeedError(null)

    void seedAllData(services, (msg) => {
      setSeedLog((prev) => [...prev, msg])
    })
      .then(() => {
        setSeeding(false)
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setSeedError(message)
        setSeedLog((prev) => [...prev, `ERROR: ${message}`])
        setSeeding(false)
      })
  }

  const handlePreview = () => {
    setPreviewing(true)
    setPreviewLog([])
    setPreviewError(null)

    void clearAllData(
      services,
      (msg) => {
        setPreviewLog((prev) => [...prev, msg])
      },
      { dryRun: true },
    )
      .then(() => {
        setPreviewing(false)
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setPreviewError(message)
        setPreviewLog((prev) => [...prev, `ERROR: ${message}`])
        setPreviewing(false)
      })
  }

  const handleClear = () => {
    setShowClearDialog(false)
    setClearing(true)
    setClearLog([])
    setClearError(null)

    void clearAllData(services, (msg) => {
      setClearLog((prev) => [...prev, msg])
    })
      .then(() => {
        setClearing(false)
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setClearError(message)
        setClearLog((prev) => [...prev, `ERROR: ${message}`])
        setClearing(false)
      })
  }

  return (
    <div className={styles.page}>
      <Title2 as="h1">Settings</Title2>

      {/* ── Card 1: PM Template Management ─────────────────────────────── */}
      <Card className={styles.card}>
        <Text size={400} weight="semibold">
          PM Template Management
        </Text>
        <Text size={200}>
          Create and manage Preventative Maintenance templates and their checklist items.
        </Text>

        {pmLoading && <Text size={200}>Loading…</Text>}
        {(pmError ?? pmActionError) && (
          <Text className={styles.errorText}>{pmError ?? pmActionError}</Text>
        )}
        {pmSuccess && <Text className={styles.successText}>{pmSuccess}</Text>}

        {/* New template form */}
        <div className={styles.form}>
          <Field label="Name" required>
            <Input value={newName} onChange={(_e, d) => setNewName(d.value)} />
          </Field>
          <Field label="Description">
            <Textarea value={newDescription} onChange={(_e, d) => setNewDescription(d.value)} />
          </Field>
          <Field label="Equipment">
            <Select value={newEquipmentId} onChange={(_e, d) => setNewEquipmentId(d.value)}>
              <option value="">— Select Equipment —</option>
              {equipment.map((eq) => (
                <option key={eq.equipmentId} value={eq.equipmentId}>
                  {eq.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Frequency">
            <Select value={newFrequency} onChange={(_e, d) => setNewFrequency(d.value)}>
              {Object.values(PMFrequency).map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </Field>
          <Checkbox
            label="Active"
            checked={newActive}
            onChange={(_e, d) => setNewActive(!!d.checked)}
          />
          <Button
            appearance="primary"
            onClick={handleCreateTemplate}
            disabled={!newName.trim() || pmLoading || creating}
          >
            Create Template
          </Button>
        </div>

        {/* Existing templates */}
        {templates.length > 0 && (
          <>
            <Text size={300} weight="semibold" style={{ marginTop: '8px' }}>
              Existing Templates ({templates.length})
            </Text>
            {templates.map((tpl) => (
              <div key={tpl.pmTemplateId}>
                <div className={styles.cardHeader}>
                  <div>
                    <Text weight="semibold">{tpl.name}</Text>
                    {' — '}
                    <Text size={200}>
                      {tpl.frequency} · {tpl.active ? 'Active' : 'Inactive'}
                    </Text>
                  </div>
                  <Button
                    appearance="subtle"
                    size="small"
                    onClick={() => handleToggleExpand(tpl.pmTemplateId)}
                  >
                    {expandedTemplateId === tpl.pmTemplateId ? 'Collapse' : 'Checklist Items'}
                  </Button>
                </div>

                {expandedTemplateId === tpl.pmTemplateId && (
                  <div className={styles.collapsible}>
                    {(templateItems[tpl.pmTemplateId] ?? []).length === 0 ? (
                      <Text size={200}>No checklist items yet.</Text>
                    ) : (
                      (templateItems[tpl.pmTemplateId] ?? []).map((item) => (
                        <div key={item.pmTemplateItemId} className={styles.templateItem}>
                          <Text size={200}>
                            #{item.sortOrder} — {item.description}
                          </Text>
                          <Button
                            appearance="subtle"
                            size="small"
                            onClick={() =>
                              handleDeleteItem(tpl.pmTemplateId, item.pmTemplateItemId)
                            }
                          >
                            Delete
                          </Button>
                        </div>
                      ))
                    )}

                    <div className={styles.row} style={{ marginTop: '8px' }}>
                      <Field label="Item Description">
                        <Input value={newItemDesc} onChange={(_e, d) => setNewItemDesc(d.value)} />
                      </Field>
                      <Field label="Sort Order">
                        <Input
                          type="number"
                          value={newItemSort}
                          onChange={(_e, d) => setNewItemSort(d.value)}
                          style={{ width: '80px' }}
                        />
                      </Field>
                      <Button
                        appearance="secondary"
                        size="small"
                        onClick={() => handleAddItem(tpl.pmTemplateId)}
                        disabled={!newItemDesc.trim()}
                      >
                        Add Item
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </Card>

      {/* ── Card 2: Issue Priority & Status Reference ──────────────────── */}
      <Card className={styles.card}>
        <Text size={400} weight="semibold">
          Issue Priority &amp; Status Reference
        </Text>
        <Text size={200}>
          Reference values used by Module 1 (Issue/Corrective Action) and Module 2 (Preventative
          Maintenance).
        </Text>

        <div className={styles.enumSection}>
          <Text weight="semibold">Issue Statuses</Text>
          <div className={styles.enumList}>
            {Object.values(IssueStatus).map((v) => (
              <Text key={v} size={200}>
                {v}
              </Text>
            ))}
          </div>
        </div>

        <div className={styles.enumSection}>
          <Text weight="semibold">Issue Priorities</Text>
          <div className={styles.enumList}>
            {Object.values(IssuePriority).map((v) => (
              <Text key={v} size={200}>
                {v}
              </Text>
            ))}
          </div>
        </div>

        <div className={styles.enumSection}>
          <Text weight="semibold">Corrective Action Statuses</Text>
          <div className={styles.enumList}>
            {Object.values(CorrectiveActionStatus).map((v) => (
              <Text key={v} size={200}>
                {v}
              </Text>
            ))}
          </div>
        </div>
      </Card>

      <Card className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <Text size={400} weight="semibold">
              Seed Data
            </Text>
            <br />
            <Text size={200}>
              Populate the database with sample buildings, teams, people, equipment, and loans.
            </Text>
          </div>
          <Button appearance="primary" onClick={handleSeed} disabled={busy}>
            {seeding ? 'Seeding...' : 'Seed Data'}
          </Button>
        </div>

        {seedLog.length > 0 && (
          <div className={styles.log} ref={seedLogRef}>
            {seedLog.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}

        {seedError && <Text className={styles.errorText}>Seed failed: {seedError}</Text>}
        {!seeding && seedLog.length > 0 && !seedError && (
          <Text className={styles.successText}>Seed completed successfully.</Text>
        )}
      </Card>

      <Card className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <Text size={400} weight="semibold">
              Preview Clear
            </Text>
            <br />
            <Text size={200}>
              Dry run — lists every record that would be deleted without modifying any data.
            </Text>
          </div>
          <Button appearance="secondary" onClick={handlePreview} disabled={busy}>
            {previewing ? 'Scanning...' : 'Preview Clear'}
          </Button>
        </div>

        {previewLog.length > 0 && (
          <div className={styles.log} ref={previewLogRef}>
            {previewLog.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}

        {previewError && <Text className={styles.errorText}>Preview failed: {previewError}</Text>}
        {!previewing && previewLog.length > 0 && !previewError && (
          <Text className={styles.successText}>Preview complete — no data was modified.</Text>
        )}
      </Card>

      <Card className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <Text size={400} weight="semibold">
              Clear All Data
            </Text>
            <br />
            <Text size={200}>
              Remove all SimQuip records from the database. Run Preview Clear first to verify.
            </Text>
          </div>
          <Dialog open={showClearDialog} onOpenChange={(_e, data) => setShowClearDialog(data.open)}>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="primary" color="danger" disabled={busy}>
                {clearing ? 'Clearing...' : 'Clear All Data'}
              </Button>
            </DialogTrigger>
            <DialogSurface>
              <DialogBody>
                <DialogTitle>Clear All Data?</DialogTitle>
                <DialogContent>
                  This will permanently delete all buildings, levels, locations, teams, persons,
                  equipment, media, and loan transfers from the database. This cannot be undone.
                </DialogContent>
                <DialogActions>
                  <DialogTrigger disableButtonEnhancement>
                    <Button appearance="secondary">Cancel</Button>
                  </DialogTrigger>
                  <Button appearance="primary" onClick={handleClear}>
                    Yes, Clear All Data
                  </Button>
                </DialogActions>
              </DialogBody>
            </DialogSurface>
          </Dialog>
        </div>

        {clearLog.length > 0 && (
          <div className={styles.log} ref={clearLogRef}>
            {clearLog.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}

        {clearError && <Text className={styles.errorText}>Clear failed: {clearError}</Text>}
        {!clearing && clearLog.length > 0 && !clearError && (
          <Text className={styles.successText}>All data cleared successfully.</Text>
        )}
      </Card>
    </div>
  )
}
