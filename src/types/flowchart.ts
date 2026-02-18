export const FlowNodeType = {
  Start: 'start',
  Step: 'step',
  Decision: 'decision',
  End: 'end',
} as const
export type FlowNodeType = (typeof FlowNodeType)[keyof typeof FlowNodeType]

export interface FlowNodeData {
  label: string
  description?: string
  [key: string]: unknown
}

export interface FlowNode {
  id: string
  type: FlowNodeType
  position: { x: number; y: number }
  data: FlowNodeData
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  label?: string
  animated?: boolean
}

export interface FlowChartData {
  version: 1
  nodes: FlowNode[]
  edges: FlowEdge[]
}

/**
 * Parse quickStartFlowChartJson into FlowChartData or null.
 */
export function parseFlowChartJson(json: string): FlowChartData | null {
  if (!json || json === '{}') return null

  try {
    const parsed: unknown = JSON.parse(json)
    if (typeof parsed !== 'object' || parsed === null) return null

    const obj = parsed as Record<string, unknown>
    if (!Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) return null

    const nodes: FlowNode[] = (obj.nodes as unknown[])
      .filter(
        (n): n is Record<string, unknown> =>
          typeof n === 'object' &&
          n !== null &&
          'id' in n &&
          'type' in n &&
          'position' in n &&
          'data' in n,
      )
      .map((n) => ({
        id: String(n.id),
        type: String(n.type) as FlowNodeType,
        position: n.position as { x: number; y: number },
        data: n.data as FlowNodeData,
      }))

    const edges: FlowEdge[] = (obj.edges as unknown[])
      .filter(
        (e): e is Record<string, unknown> =>
          typeof e === 'object' && e !== null && 'id' in e && 'source' in e && 'target' in e,
      )
      .map((e) => ({
        id: String(e.id),
        source: String(e.source),
        target: String(e.target),
        label: typeof e.label === 'string' ? e.label : undefined,
        animated: typeof e.animated === 'boolean' ? e.animated : undefined,
      }))

    return { version: 1, nodes, edges }
  } catch {
    return null
  }
}

/**
 * Serialize FlowChartData to JSON string for storage.
 */
export function serializeFlowChart(data: FlowChartData): string {
  return JSON.stringify(data)
}

/**
 * Create an empty flowchart with a start node.
 */
export function createEmptyFlowChart(): FlowChartData {
  return {
    version: 1,
    nodes: [
      {
        id: 'start-1',
        type: FlowNodeType.Start,
        position: { x: 250, y: 50 },
        data: { label: 'Start' },
      },
    ],
    edges: [],
  }
}
