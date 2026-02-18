import { useCallback, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  MiniMap,
} from '@xyflow/react'
import type { Connection, Edge, Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Input,
  makeStyles,
  Text,
  Textarea,
  tokens,
} from '@fluentui/react-components'
import { SaveRegular, DismissRegular, AddCircleRegular, ArrowSortRegular } from '@fluentui/react-icons'
import { flowChartNodeTypes } from './FlowChartNodeTypes'
import type { FlowChartData } from '../../types'
import { FlowNodeType, createEmptyFlowChart } from '../../types'

const useStyles = makeStyles({
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
  },
  palette: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    flexGrow: 1,
  },
  paletteItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    ':hover': {
      boxShadow: tokens.shadow4,
    },
  },
  container: {
    width: '100%',
    height: '500px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
  },
  spacer: {
    flexGrow: 1,
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
  },
})

const nodeColors: Record<string, string> = {
  start: 'var(--redi-coral)',
  step: 'var(--redi-teal)',
  decision: 'var(--redi-navy)',
  end: 'var(--redi-coral-dark)',
}

/**
 * Auto-layout nodes in a top-to-bottom tree arrangement.
 * Uses BFS from start node, centres each level horizontally.
 */
function autoLayoutNodes(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes

  const NODE_WIDTH = 200
  const NODE_HEIGHT = 80
  const H_GAP = 60
  const V_GAP = 100

  // Build adjacency
  const adj = new Map<string, string[]>()
  const inDegree = new Map<string, number>()
  for (const n of nodes) {
    adj.set(n.id, [])
    inDegree.set(n.id, 0)
  }
  for (const e of edges) {
    adj.get(e.source)?.push(e.target)
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
  }

  // Find start node (type=start or zero in-degree)
  let startId = nodes.find((n) => n.type === 'start')?.id
  if (!startId) {
    startId = nodes.find((n) => (inDegree.get(n.id) ?? 0) === 0)?.id ?? nodes[0].id
  }

  // BFS to assign levels
  const levels = new Map<string, number>()
  const queue = [startId]
  levels.set(startId, 0)
  const visited = new Set<string>()

  while (queue.length > 0) {
    const id = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    const level = levels.get(id) ?? 0
    for (const target of adj.get(id) ?? []) {
      if (!visited.has(target)) {
        const existing = levels.get(target) ?? -1
        levels.set(target, Math.max(existing, level + 1))
        queue.push(target)
      }
    }
  }

  // Add any unvisited nodes to the last level
  let maxLevel = 0
  for (const l of levels.values()) maxLevel = Math.max(maxLevel, l)
  for (const n of nodes) {
    if (!levels.has(n.id)) {
      maxLevel++
      levels.set(n.id, maxLevel)
    }
  }

  // Group by level
  const levelGroups = new Map<number, string[]>()
  for (const [id, level] of levels) {
    if (!levelGroups.has(level)) levelGroups.set(level, [])
    levelGroups.get(level)!.push(id)
  }

  // Position nodes
  const positions = new Map<string, { x: number; y: number }>()
  for (const [level, ids] of levelGroups) {
    const totalWidth = ids.length * NODE_WIDTH + (ids.length - 1) * H_GAP
    const startX = -totalWidth / 2
    ids.forEach((id, i) => {
      positions.set(id, {
        x: startX + i * (NODE_WIDTH + H_GAP),
        y: level * (NODE_HEIGHT + V_GAP),
      })
    })
  }

  return nodes.map((n) => ({
    ...n,
    position: positions.get(n.id) ?? n.position,
  }))
}

interface FlowChartEditorProps {
  data: FlowChartData | null
  onSave: (data: FlowChartData) => void
  onCancel: () => void
}

export default function FlowChartEditor({ data, onSave, onCancel }: FlowChartEditorProps) {
  const styles = useStyles()

  const initialData = data ?? createEmptyFlowChart()

  const initialNodes: Node[] = useMemo(
    () =>
      initialData.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const initialEdges: Edge[] = useMemo(
    () =>
      initialData.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        animated: e.animated,
        style: { stroke: 'var(--redi-navy)', strokeWidth: 2 },
        labelStyle: { fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: 12 },
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Node creation dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addNodeType, setAddNodeType] = useState<string>(FlowNodeType.Step)
  const [addLabel, setAddLabel] = useState('')
  const [addDescription, setAddDescription] = useState('')

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge({ ...connection, style: { stroke: 'var(--redi-navy)', strokeWidth: 2 } }, eds),
      )
    },
    [setEdges],
  )

  const openAddDialog = (nodeType: string) => {
    setAddNodeType(nodeType)
    setAddLabel(
      nodeType === FlowNodeType.Start ? 'Start' : nodeType === FlowNodeType.End ? 'End' : '',
    )
    setAddDescription('')
    setAddDialogOpen(true)
  }

  const handleAddNode = () => {
    if (!addLabel.trim()) return
    const id = `node-${Date.now()}`
    const newNode: Node = {
      id,
      type: addNodeType,
      position: { x: 250, y: nodes.length * 120 },
      data: {
        label: addLabel.trim(),
        description: addDescription.trim() || undefined,
      },
    }
    setNodes((nds) => [...nds, newNode])
    setAddDialogOpen(false)
  }

  const handleAutoLayout = useCallback(() => {
    setNodes((nds) => autoLayoutNodes(nds, edges))
  }, [setNodes, edges])

  const handleSave = () => {
    // Auto-layout before saving
    const layoutNodes = autoLayoutNodes(nodes, edges)
    const chartData: FlowChartData = {
      version: 1,
      nodes: layoutNodes.map((n) => ({
        id: n.id,
        type: (n.type ?? FlowNodeType.Step) as FlowNodeType,
        position: n.position,
        data: n.data as { label: string; description?: string },
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: typeof e.label === 'string' ? e.label : undefined,
        animated: e.animated,
      })),
    }
    onSave(chartData)
  }

  const handleDeleteSelected = useCallback(() => {
    setNodes((nds) => nds.filter((n) => !n.selected))
    setEdges((eds) => eds.filter((e) => !e.selected))
  }, [setNodes, setEdges])

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <div className={styles.palette}>
          {Object.entries(FlowNodeType).map(([key, value]) => (
            <button
              key={key}
              className={styles.paletteItem}
              style={{ borderColor: nodeColors[value], color: nodeColors[value] }}
              onClick={() => openAddDialog(value)}
            >
              <AddCircleRegular />
              {key}
            </button>
          ))}
        </div>
        <Button size="small" icon={<ArrowSortRegular />} onClick={handleAutoLayout}>
          Auto Layout
        </Button>
        <Button size="small" onClick={handleDeleteSelected}>
          Delete Selected
        </Button>
        <div className={styles.actions}>
          <Button icon={<DismissRegular />} onClick={onCancel}>
            Cancel
          </Button>
          <Button icon={<SaveRegular />} appearance="primary" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>

      <div className={styles.container}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={flowChartNodeTypes}
          fitView
          deleteKeyCode="Delete"
          attributionPosition="bottom-left"
        >
          <Controls />
          <MiniMap nodeColor={(node) => nodeColors[node.type ?? 'step'] ?? '#eee'} />
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        </ReactFlow>
      </div>

      <Text size={200}>
        Drag nodes to reposition. Connect nodes by dragging from a handle to another. Select and
        press Delete to remove. Click a palette button to add new nodes.
      </Text>

      {/* Add node dialog */}
      <Dialog
        open={addDialogOpen}
        onOpenChange={(_, d) => {
          if (!d.open) setAddDialogOpen(false)
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>
              Add {addNodeType.charAt(0).toUpperCase() + addNodeType.slice(1)} Node
            </DialogTitle>
            <DialogContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Input
                  placeholder="Label"
                  value={addLabel}
                  onChange={(_, d) => setAddLabel(d.value)}
                />
                {addNodeType === FlowNodeType.Step && (
                  <Textarea
                    placeholder="Description (optional)"
                    value={addDescription}
                    onChange={(_, d) => setAddDescription(d.value)}
                    rows={2}
                  />
                )}
              </div>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button appearance="primary" onClick={handleAddNode} disabled={!addLabel.trim()}>
                Add
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  )
}
