import { describe, expect, it } from 'vitest'
import { parseFlowChartJson, serializeFlowChart, createEmptyFlowChart } from './flowchart'

describe('parseFlowChartJson', () => {
  it('returns null for empty string', () => {
    expect(parseFlowChartJson('')).toBeNull()
  })

  it('returns null for empty object', () => {
    expect(parseFlowChartJson('{}')).toBeNull()
  })

  it('returns null for invalid JSON', () => {
    expect(parseFlowChartJson('not json')).toBeNull()
  })

  it('returns null for non-object JSON', () => {
    expect(parseFlowChartJson('"string"')).toBeNull()
  })

  it('returns null when nodes/edges missing', () => {
    expect(parseFlowChartJson('{"version": 1}')).toBeNull()
  })

  it('parses valid flowchart data', () => {
    const data = {
      version: 1,
      nodes: [
        { id: 'n1', type: 'start', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        {
          id: 'n2',
          type: 'step',
          position: { x: 0, y: 100 },
          data: { label: 'Do thing', description: 'Details' },
        },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', label: 'Next', animated: true }],
    }
    const result = parseFlowChartJson(JSON.stringify(data))
    expect(result).not.toBeNull()
    expect(result!.version).toBe(1)
    expect(result!.nodes).toHaveLength(2)
    expect(result!.nodes[0].type).toBe('start')
    expect(result!.nodes[1].data.description).toBe('Details')
    expect(result!.edges).toHaveLength(1)
    expect(result!.edges[0].label).toBe('Next')
    expect(result!.edges[0].animated).toBe(true)
  })

  it('handles edges without optional fields', () => {
    const data = {
      version: 1,
      nodes: [{ id: 'n1', type: 'start', position: { x: 0, y: 0 }, data: { label: 'S' } }],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    }
    const result = parseFlowChartJson(JSON.stringify(data))
    expect(result!.edges[0].label).toBeUndefined()
    expect(result!.edges[0].animated).toBeUndefined()
  })
})

describe('serializeFlowChart', () => {
  it('round-trips correctly', () => {
    const original = createEmptyFlowChart()
    const json = serializeFlowChart(original)
    const parsed = parseFlowChartJson(json)
    expect(parsed).not.toBeNull()
    expect(parsed!.nodes).toHaveLength(1)
    expect(parsed!.nodes[0].type).toBe('start')
  })
})

describe('createEmptyFlowChart', () => {
  it('creates a chart with one start node', () => {
    const chart = createEmptyFlowChart()
    expect(chart.version).toBe(1)
    expect(chart.nodes).toHaveLength(1)
    expect(chart.nodes[0].type).toBe('start')
    expect(chart.edges).toHaveLength(0)
  })
})
