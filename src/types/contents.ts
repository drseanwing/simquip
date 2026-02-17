export interface ContentsItem {
  id: string
  label: string
  checked: boolean
  sortOrder: number
}

let nextId = 1
function generateId(): string {
  return `ci-${Date.now()}-${nextId++}`
}

/**
 * Parse contentsListJson into ContentsItem[].
 * Supports both legacy format (string[]) and new format (ContentsItem[]).
 */
export function parseContentsJson(json: string): ContentsItem[] {
  if (!json || json === '[]') return []

  try {
    const parsed: unknown = JSON.parse(json)
    if (!Array.isArray(parsed)) return []

    return parsed
      .map((item, index) => {
        // New format: already a ContentsItem object
        if (typeof item === 'object' && item !== null && 'id' in item && 'label' in item) {
          const obj = item as Record<string, unknown>
          return {
            id: String(obj.id),
            label: String(obj.label),
            checked: typeof obj.checked === 'boolean' ? obj.checked : false,
            sortOrder: typeof obj.sortOrder === 'number' ? obj.sortOrder : index,
          }
        }

        // Legacy format: plain string
        if (typeof item === 'string') {
          return {
            id: generateId(),
            label: item,
            checked: false,
            sortOrder: index,
          }
        }

        return null
      })
      .filter((item): item is ContentsItem => item !== null)
  } catch {
    return []
  }
}

/**
 * Serialize ContentsItem[] to JSON string for storage.
 */
export function serializeContents(items: ContentsItem[]): string {
  return JSON.stringify(
    items.map((item, index) => ({
      id: item.id,
      label: item.label,
      checked: item.checked,
      sortOrder: index,
    })),
  )
}

/**
 * Create a new empty ContentsItem.
 */
export function createContentsItem(label: string, sortOrder: number): ContentsItem {
  return {
    id: generateId(),
    label,
    checked: false,
    sortOrder,
  }
}
