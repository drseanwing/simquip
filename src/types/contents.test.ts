import { describe, expect, it } from 'vitest'
import { parseContentsJson, serializeContents, createContentsItem } from './contents'

describe('parseContentsJson', () => {
  it('returns empty array for empty string', () => {
    expect(parseContentsJson('')).toEqual([])
  })

  it('returns empty array for empty JSON array', () => {
    expect(parseContentsJson('[]')).toEqual([])
  })

  it('parses legacy string array format', () => {
    const result = parseContentsJson('["Manikin","Defibrillator Trainer"]')
    expect(result).toHaveLength(2)
    expect(result[0].label).toBe('Manikin')
    expect(result[0].checked).toBe(false)
    expect(result[0].sortOrder).toBe(0)
    expect(result[1].label).toBe('Defibrillator Trainer')
    expect(result[1].sortOrder).toBe(1)
  })

  it('parses new ContentsItem format', () => {
    const json = JSON.stringify([
      { id: 'c1', label: 'Item A', checked: true, sortOrder: 0 },
      { id: 'c2', label: 'Item B', checked: false, sortOrder: 1 },
    ])
    const result = parseContentsJson(json)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('c1')
    expect(result[0].label).toBe('Item A')
    expect(result[0].checked).toBe(true)
    expect(result[1].checked).toBe(false)
  })

  it('handles invalid JSON gracefully', () => {
    expect(parseContentsJson('not json')).toEqual([])
  })

  it('handles non-array JSON', () => {
    expect(parseContentsJson('{"key": "value"}')).toEqual([])
  })

  it('skips non-string/non-object items', () => {
    const result = parseContentsJson('[123, null, "Valid"]')
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('Valid')
  })
})

describe('serializeContents', () => {
  it('serializes items with correct sortOrder', () => {
    const items = [createContentsItem('A', 5), createContentsItem('B', 10)]
    const json = serializeContents(items)
    const parsed = JSON.parse(json) as Array<{ sortOrder: number }>
    expect(parsed[0].sortOrder).toBe(0)
    expect(parsed[1].sortOrder).toBe(1)
  })

  it('serializes empty array', () => {
    expect(serializeContents([])).toBe('[]')
  })
})

describe('createContentsItem', () => {
  it('creates an item with correct defaults', () => {
    const item = createContentsItem('Test Item', 3)
    expect(item.label).toBe('Test Item')
    expect(item.checked).toBe(false)
    expect(item.sortOrder).toBe(3)
    expect(item.id).toBeTruthy()
  })
})
