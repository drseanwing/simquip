import { useState, useRef, useEffect } from 'react'
import {
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  makeStyles,
  Text,
  Title2,
  tokens,
} from '@fluentui/react-components'
import { useServices } from '../contexts/ServiceContext'
import { seedAllData, clearAllData } from '../services/seedData'

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
})

export default function SettingsPage() {
  const styles = useStyles()
  const services = useServices()

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

    void clearAllData(services, (msg) => {
      setPreviewLog((prev) => [...prev, msg])
    }, { dryRun: true })
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
