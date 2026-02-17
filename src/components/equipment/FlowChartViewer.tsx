import { useMemo } from 'react'
import { ReactFlow, MiniMap, Background, BackgroundVariant } from '@xyflow/react'
import type { Node, Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { makeStyles, Text, tokens } from '@fluentui/react-components'
import { flowChartNodeTypes } from './FlowChartNodeTypes'
import type { FlowChartData } from '../../types'

const useStyles = makeStyles({
  container: {
    width: '100%',
    height: '500px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
  },
  empty: {
    color: tokens.colorNeutralForeground3,
    fontStyle: 'italic',
    padding: tokens.spacingVerticalM,
  },
})

interface FlowChartViewerProps {
  data: FlowChartData | null
}

export default function FlowChartViewer({ data }: FlowChartViewerProps) {
  const styles = useStyles()

  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [] as Node[], edges: [] as Edge[] }

    const nodes: Node[] = data.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data,
    }))

    const edges: Edge[] = data.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: e.animated,
      style: { stroke: 'var(--redi-navy)', strokeWidth: 2 },
      labelStyle: { fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: 12 },
    }))

    return { nodes, edges }
  }, [data])

  if (!data || data.nodes.length === 0) {
    return <Text className={styles.empty}>No quick start flow chart configured.</Text>
  }

  return (
    <div className={styles.container}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={flowChartNodeTypes}
        fitView
        attributionPosition="bottom-left"
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
      >
        <MiniMap
          nodeStrokeColor="var(--redi-navy)"
          nodeColor={(node) => {
            switch (node.type) {
              case 'start':
                return 'var(--redi-coral)'
              case 'step':
                return 'var(--redi-teal)'
              case 'decision':
                return 'var(--redi-navy)'
              case 'end':
                return 'var(--redi-coral-dark)'
              default:
                return '#eee'
            }
          }}
        />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      </ReactFlow>
    </div>
  )
}
