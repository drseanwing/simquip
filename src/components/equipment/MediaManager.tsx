import { useState } from 'react'
import { Button, makeStyles, Text, Title3, tokens } from '@fluentui/react-components'
import { AddRegular, DeleteRegular, DocumentRegular, ImageRegular } from '@fluentui/react-icons'
import { MediaType } from '../../types'
import type { EquipmentMedia } from '../../types'
import { sanitizeFilename } from '../../utils/fileValidation'
import MediaUploadDialog from './MediaUploadDialog'

const useStyles = makeStyles({
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  imageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: tokens.spacingHorizontalM,
  },
  imageCard: {
    position: 'relative' as const,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  imageThumbnail: {
    width: '100%',
    aspectRatio: '4 / 3',
    objectFit: 'cover',
    display: 'block',
  },
  imageOverlay: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#ffffff',
  },
  attachmentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  attachmentRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  attachmentName: {
    flexGrow: 1,
  },
  empty: {
    color: tokens.colorNeutralForeground3,
    fontStyle: 'italic',
    padding: tokens.spacingVerticalM,
  },
})

interface MediaManagerProps {
  media: EquipmentMedia[]
  onMediaChange: (media: EquipmentMedia[]) => void
  readOnly?: boolean
}

export default function MediaManager({
  media,
  onMediaChange,
  readOnly = false,
}: MediaManagerProps) {
  const styles = useStyles()
  const [uploadOpen, setUploadOpen] = useState(false)

  const images = media
    .filter((m) => m.mediaType === MediaType.Image)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const attachments = media
    .filter((m) => m.mediaType === MediaType.Attachment)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const handleUpload = (file: File) => {
    const isImage = file.type.startsWith('image/')
    const newMedia: EquipmentMedia = {
      equipmentMediaId: `em-local-${Date.now()}`,
      equipmentId: '',
      mediaType: isImage ? MediaType.Image : MediaType.Attachment,
      fileName: sanitizeFilename(file.name),
      mimeType: file.type,
      fileUrl: URL.createObjectURL(file),
      sortOrder: media.length,
    }
    onMediaChange([...media, newMedia])
  }

  const handleDelete = (id: string) => {
    const item = media.find((m) => m.equipmentMediaId === id)
    if (item?.fileUrl.startsWith('blob:')) {
      URL.revokeObjectURL(item.fileUrl)
    }
    onMediaChange(media.filter((m) => m.equipmentMediaId !== id))
  }

  return (
    <div className={styles.wrapper}>
      {/* Images section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <Title3>
            <ImageRegular /> Images
          </Title3>
          {!readOnly && (
            <Button icon={<AddRegular />} onClick={() => setUploadOpen(true)}>
              Upload
            </Button>
          )}
        </div>

        {images.length === 0 ? (
          <Text className={styles.empty}>No images uploaded.</Text>
        ) : (
          <div className={styles.imageGrid}>
            {images.map((img) => (
              <div key={img.equipmentMediaId} className={styles.imageCard}>
                <img src={img.fileUrl} alt={img.fileName} className={styles.imageThumbnail} />
                <div className={styles.imageOverlay}>
                  <Text size={100} style={{ color: '#fff' }}>
                    {img.fileName}
                  </Text>
                  {!readOnly && (
                    <Button
                      icon={<DeleteRegular />}
                      size="small"
                      appearance="subtle"
                      onClick={() => handleDelete(img.equipmentMediaId)}
                      aria-label="Delete image"
                      style={{ color: '#fff' }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attachments section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <Title3>
            <DocumentRegular /> Attachments
          </Title3>
        </div>

        {attachments.length === 0 ? (
          <Text className={styles.empty}>No attachments uploaded.</Text>
        ) : (
          <div className={styles.attachmentList}>
            {attachments.map((att) => (
              <div key={att.equipmentMediaId} className={styles.attachmentRow}>
                <DocumentRegular />
                <Text className={styles.attachmentName}>{att.fileName}</Text>
                <Text size={200}>{att.mimeType}</Text>
                {!readOnly && (
                  <Button
                    icon={<DeleteRegular />}
                    size="small"
                    appearance="subtle"
                    onClick={() => handleDelete(att.equipmentMediaId)}
                    aria-label="Delete attachment"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <MediaUploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUpload={handleUpload}
      />
    </div>
  )
}
