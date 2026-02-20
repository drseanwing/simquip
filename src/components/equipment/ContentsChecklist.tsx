import { useCallback, useRef, useState } from 'react'
import {
  Button,
  Checkbox,
  Input,
  makeStyles,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  tokens,
} from '@fluentui/react-components'
import {
  AddRegular,
  ArrowMoveRegular,
  DeleteRegular,
  EditRegular,
  SaveRegular,
  DismissRegular,
} from '@fluentui/react-icons'
import type { ContentsItem } from '../../types'
import { createContentsItem } from '../../types'

const useStyles = makeStyles({
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  toolbar: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    justifyContent: 'flex-end',
  },
  dragRow: {
    cursor: 'grab',
    ':active': {
      cursor: 'grabbing',
    },
  },
  dragHandle: {
    cursor: 'grab',
    color: tokens.colorNeutralForeground3,
    ':active': {
      cursor: 'grabbing',
    },
  },
  dragOver: {
    borderTop: `2px solid var(--redi-teal)`,
  },
  actionsCell: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
  },
  empty: {
    color: tokens.colorNeutralForeground3,
    fontStyle: 'italic',
    padding: tokens.spacingVerticalM,
  },
  addRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'center',
    paddingTop: tokens.spacingVerticalS,
  },
  addInput: {
    flexGrow: 1,
  },
})

interface ContentsChecklistProps {
  items: ContentsItem[]
  onSave: (items: ContentsItem[]) => void
  readOnly?: boolean
}

export default function ContentsChecklist({
  items,
  onSave,
  readOnly = false,
}: ContentsChecklistProps) {
  const styles = useStyles()
  const [editing, setEditing] = useState(false)
  const [editItems, setEditItems] = useState<ContentsItem[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const startEditing = () => {
    setEditItems(items.map((i) => ({ ...i })))
    setEditing(true)
    setNewLabel('')
    setEditingId(null)
  }

  const cancelEditing = () => {
    setEditing(false)
    setEditItems([])
    setEditingId(null)
  }

  const saveEditing = () => {
    const reordered = editItems.map((item, index) => ({ ...item, sortOrder: index }))
    onSave(reordered)
    setEditing(false)
    setEditItems([])
    setEditingId(null)
  }

  const handleCheck = (id: string, checked: boolean) => {
    const lastChecked = checked ? new Date().toISOString() : null
    if (editing) {
      setEditItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked, lastChecked } : i)))
    } else {
      const updated = items.map((i) => (i.id === id ? { ...i, checked, lastChecked } : i))
      onSave(updated)
    }
  }

  const addItem = () => {
    if (!newLabel.trim()) return
    const item = createContentsItem(newLabel.trim(), editItems.length)
    setEditItems((prev) => [...prev, item])
    setNewLabel('')
  }

  const deleteItem = (id: string) => {
    setEditItems((prev) => prev.filter((i) => i.id !== id))
  }

  const startInlineEdit = (item: ContentsItem) => {
    setEditingId(item.id)
    setEditLabel(item.label)
  }

  const commitInlineEdit = () => {
    if (editingId && editLabel.trim()) {
      setEditItems((prev) =>
        prev.map((i) => (i.id === editingId ? { ...i, label: editLabel.trim() } : i)),
      )
    }
    setEditingId(null)
  }

  // Drag and drop handlers
  const handleDragStart = useCallback((index: number) => {
    dragIndexRef.current = index
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }, [])

  const handleDrop = useCallback((index: number) => {
    const from = dragIndexRef.current
    if (from === null || from === index) {
      setDragOverIndex(null)
      return
    }
    setEditItems((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(index, 0, moved)
      return next
    })
    dragIndexRef.current = null
    setDragOverIndex(null)
  }, [])

  const handleDragEnd = useCallback(() => {
    dragIndexRef.current = null
    setDragOverIndex(null)
  }, [])

  const displayItems = editing ? editItems : [...items].sort((a, b) => a.sortOrder - b.sortOrder)

  if (displayItems.length === 0 && !editing) {
    return (
      <div className={styles.wrapper}>
        <Text className={styles.empty}>No contents listed.</Text>
        {!readOnly && (
          <div className={styles.toolbar}>
            <Button icon={<EditRegular />} onClick={startEditing}>
              Edit Contents
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      {!readOnly && (
        <div className={styles.toolbar}>
          {editing ? (
            <>
              <Button icon={<DismissRegular />} onClick={cancelEditing}>
                Cancel
              </Button>
              <Button icon={<SaveRegular />} appearance="primary" onClick={saveEditing}>
                Save
              </Button>
            </>
          ) : (
            <Button icon={<EditRegular />} onClick={startEditing}>
              Edit Contents
            </Button>
          )}
        </div>
      )}

      <Table aria-label="Contents checklist">
        <TableHeader>
          <TableRow>
            {editing && <TableHeaderCell style={{ width: 40 }} />}
            <TableHeaderCell style={{ width: 50 }}>Done</TableHeaderCell>
            <TableHeaderCell>Item</TableHeaderCell>
            <TableHeaderCell style={{ width: 140 }}>Last Checked</TableHeaderCell>
            {editing && <TableHeaderCell style={{ width: 90 }}>Actions</TableHeaderCell>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayItems.map((item, index) => (
            <TableRow
              key={item.id}
              className={`${editing ? styles.dragRow : ''} ${dragOverIndex === index ? styles.dragOver : ''}`}
              draggable={editing}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e: React.DragEvent) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
            >
              {editing && (
                <TableCell>
                  <ArrowMoveRegular className={styles.dragHandle} />
                </TableCell>
              )}
              <TableCell>
                <Checkbox
                  checked={item.checked}
                  onChange={(_, data) => handleCheck(item.id, !!data.checked)}
                />
              </TableCell>
              <TableCell>
                {editing && editingId === item.id ? (
                  <Input
                    value={editLabel}
                    onChange={(_, data) => setEditLabel(data.value)}
                    onBlur={commitInlineEdit}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === 'Enter') commitInlineEdit()
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    autoFocus
                    style={{ width: '100%' }}
                  />
                ) : (
                  <Text onClick={() => editing && startInlineEdit(item)}>{item.label}</Text>
                )}
              </TableCell>
              <TableCell>
                {item.lastChecked ? (
                  <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                    {new Date(item.lastChecked).toLocaleDateString()}
                  </Text>
                ) : (
                  <Text
                    size={200}
                    style={{ color: tokens.colorNeutralForeground3, fontStyle: 'italic' }}
                  >
                    —
                  </Text>
                )}
              </TableCell>
              {editing && (
                <TableCell>
                  <div className={styles.actionsCell}>
                    <Button
                      icon={<EditRegular />}
                      size="small"
                      appearance="subtle"
                      onClick={() => startInlineEdit(item)}
                      aria-label="Edit item"
                    />
                    <Button
                      icon={<DeleteRegular />}
                      size="small"
                      appearance="subtle"
                      onClick={() => deleteItem(item.id)}
                      aria-label="Delete item"
                    />
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editing && (
        <div className={styles.addRow}>
          <Input
            className={styles.addInput}
            placeholder="Add new item..."
            value={newLabel}
            onChange={(_, data) => setNewLabel(data.value)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter') addItem()
            }}
          />
          <Button icon={<AddRegular />} onClick={addItem} disabled={!newLabel.trim()}>
            Add
          </Button>
        </div>
      )}
    </div>
  )
}
