/* eslint-disable react-refresh/only-export-components */
import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { makeStyles, Text, tokens } from '@fluentui/react-components'

const useStyles = makeStyles({
  nodeBase: {
    padding: '10px 16px',
    borderRadius: '8px',
    minWidth: '140px',
    maxWidth: '220px',
    textAlign: 'center' as const,
    boxShadow: tokens.shadow4,
    fontFamily: "'Montserrat', sans-serif",
  },
  startNode: {
    backgroundColor: 'var(--redi-coral)',
    color: '#ffffff',
    borderRadius: '24px',
  },
  stepNode: {
    backgroundColor: 'var(--redi-teal)',
    color: '#ffffff',
  },
  decisionNode: {
    backgroundColor: 'var(--redi-navy)',
    color: '#ffffff',
    transform: 'rotate(0deg)',
    borderRadius: '4px',
    border: '2px solid var(--redi-navy-light)',
    clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
    padding: '20px 24px',
    minWidth: '160px',
    minHeight: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endNode: {
    backgroundColor: 'var(--redi-coral-dark)',
    color: '#ffffff',
    borderRadius: '24px',
  },
  label: {
    fontWeight: 600,
    fontSize: '13px',
  },
  description: {
    fontSize: '11px',
    opacity: 0.9,
    marginTop: '4px',
  },
})

interface FlowNodeData {
  label: string
  description?: string
  [key: string]: unknown
}

const StartNode = memo(function StartNode({ data }: NodeProps) {
  const styles = useStyles()
  const nodeData = data as FlowNodeData
  return (
    <div className={`${styles.nodeBase} ${styles.startNode}`}>
      <Text className={styles.label}>{nodeData.label}</Text>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
})

const StepNode = memo(function StepNode({ data }: NodeProps) {
  const styles = useStyles()
  const nodeData = data as FlowNodeData
  return (
    <div className={`${styles.nodeBase} ${styles.stepNode}`}>
      <Handle type="target" position={Position.Top} />
      <Text className={styles.label}>{nodeData.label}</Text>
      {nodeData.description && <div className={styles.description}>{nodeData.description}</div>}
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
})

const DecisionNode = memo(function DecisionNode({ data }: NodeProps) {
  const styles = useStyles()
  const nodeData = data as FlowNodeData
  return (
    <div className={`${styles.nodeBase} ${styles.decisionNode}`}>
      <Handle type="target" position={Position.Top} />
      <Text className={styles.label}>{nodeData.label}</Text>
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="source" position={Position.Left} id="left" />
      <Handle type="source" position={Position.Right} id="right" />
    </div>
  )
})

const EndNode = memo(function EndNode({ data }: NodeProps) {
  const styles = useStyles()
  const nodeData = data as FlowNodeData
  return (
    <div className={`${styles.nodeBase} ${styles.endNode}`}>
      <Handle type="target" position={Position.Top} />
      <Text className={styles.label}>{nodeData.label}</Text>
    </div>
  )
})

export const flowChartNodeTypes = {
  start: StartNode,
  step: StepNode,
  decision: DecisionNode,
  end: EndNode,
}
