import { useState } from 'react'
import {
  Dialog,
  DialogBody,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  makeStyles,
  Text,
  tokens,
} from '@fluentui/react-components'
import { DismissRegular } from '@fluentui/react-icons'
import type { EquipmentMedia } from '../../types'

const useStyles = makeStyles({
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: tokens.spacingHorizontalM,
  },
  thumbnail: {
    width: '100%',
    aspectRatio: '4 / 3',
    objectFit: 'cover',
    borderRadius: tokens.borderRadiusMedium,
    cursor: 'pointer',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    transition: 'box-shadow 0.15s ease',
    ':hover': {
      boxShadow: tokens.shadow8,
    },
  },
  lightboxImage: {
    width: '100%',
    maxHeight: '70vh',
    objectFit: 'contain',
    borderRadius: tokens.borderRadiusMedium,
  },
  lightboxCaption: {
    paddingTop: tokens.spacingVerticalS,
    textAlign: 'center' as const,
  },
  closeBtn: {
    position: 'absolute' as const,
    top: tokens.spacingVerticalS,
    right: tokens.spacingHorizontalS,
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: tokens.colorNeutralForeground2,
  },
  empty: {
    color: tokens.colorNeutralForeground3,
    fontStyle: 'italic',
  },
})

interface ImageGalleryProps {
  images: EquipmentMedia[]
}

export default function ImageGallery({ images }: ImageGalleryProps) {
  const styles = useStyles()
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  if (images.length === 0) {
    return <Text className={styles.empty}>No images available.</Text>
  }

  const selected = selectedIndex !== null ? images[selectedIndex] : null

  return (
    <>
      <div className={styles.grid}>
        {images.map((img, index) => (
          <img
            key={img.equipmentMediaId}
            src={img.fileUrl}
            alt={img.fileName}
            className={styles.thumbnail}
            onClick={() => setSelectedIndex(index)}
          />
        ))}
      </div>

      <Dialog
        open={selected !== null}
        onOpenChange={(_, data) => {
          if (!data.open) setSelectedIndex(null)
        }}
      >
        <DialogSurface style={{ maxWidth: '800px' }}>
          <DialogBody>
            <DialogTitle
              action={
                <DialogTrigger action="close">
                  <button className={styles.closeBtn} aria-label="Close">
                    <DismissRegular />
                  </button>
                </DialogTrigger>
              }
            >
              {selected?.fileName}
            </DialogTitle>
            {selected && (
              <>
                <img
                  src={selected.fileUrl}
                  alt={selected.fileName}
                  className={styles.lightboxImage}
                />
                <Text className={styles.lightboxCaption} size={200}>
                  {selectedIndex !== null ? selectedIndex + 1 : 0} of {images.length}
                </Text>
              </>
            )}
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  )
}
