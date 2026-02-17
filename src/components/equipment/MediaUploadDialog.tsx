import { useRef, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  makeStyles,
  Text,
  tokens,
} from '@fluentui/react-components'
import { ArrowUploadRegular } from '@fluentui/react-icons'
import { validateUpload, sanitizeFilename } from '../../utils/fileValidation'

const useStyles = makeStyles({
  dropZone: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacingVerticalXXL,
    border: `2px dashed ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
    cursor: 'pointer',
    transition: 'border-color 0.15s ease, background-color 0.15s ease',
    gap: tokens.spacingVerticalS,
    ':hover': {
      borderTopColor: 'var(--redi-teal)',
      borderRightColor: 'var(--redi-teal)',
      borderBottomColor: 'var(--redi-teal)',
      borderLeftColor: 'var(--redi-teal)',
      backgroundColor: tokens.colorNeutralBackground3,
    },
  },
  dropZoneActive: {
    borderTopColor: 'var(--redi-teal)',
    borderRightColor: 'var(--redi-teal)',
    borderBottomColor: 'var(--redi-teal)',
    borderLeftColor: 'var(--redi-teal)',
    backgroundColor: tokens.colorNeutralBackground3,
  },
  preview: {
    marginTop: tokens.spacingVerticalM,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalS,
  },
  previewImage: {
    maxWidth: '300px',
    maxHeight: '200px',
    objectFit: 'contain',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  error: {
    color: 'var(--redi-error)',
    fontWeight: tokens.fontWeightSemibold,
  },
})

interface MediaUploadDialogProps {
  open: boolean
  onClose: () => void
  onUpload: (file: File) => void
}

export default function MediaUploadDialog({ open, onClose, onUpload }: MediaUploadDialogProps) {
  const styles = useStyles()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const reset = () => {
    setSelectedFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setError(null)
    setDragActive(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const processFile = (file: File) => {
    const result = validateUpload(file)
    if (!result.valid) {
      setError(result.error ?? 'Invalid file')
      setSelectedFile(null)
      setPreviewUrl(null)
      return
    }
    setError(null)
    setSelectedFile(file)
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file))
    } else {
      setPreviewUrl(null)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile)
      handleClose()
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(_, data) => {
        if (!data.open) handleClose()
      }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Upload Media</DialogTitle>
          <DialogContent>
            <div
              className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <ArrowUploadRegular fontSize={32} />
              <Text weight="semibold">Drop a file here or click to browse</Text>
              <Text size={200}>
                Images (JPEG, PNG, GIF, WebP) or Documents (PDF, DOC, DOCX, TXT). Max 10 MB.
              </Text>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            />
            {error && <Text className={styles.error}>{error}</Text>}
            {selectedFile && (
              <div className={styles.preview}>
                {previewUrl && (
                  <img src={previewUrl} alt="Preview" className={styles.previewImage} />
                )}
                <Text size={200}>
                  {sanitizeFilename(selectedFile.name)} ({(selectedFile.size / 1024).toFixed(0)} KB)
                </Text>
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button appearance="primary" onClick={handleUpload} disabled={!selectedFile || !!error}>
              Upload
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
