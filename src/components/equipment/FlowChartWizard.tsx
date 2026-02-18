import { useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  makeStyles,
  Text,
  tokens,
} from '@fluentui/react-components'
import {
  ArrowRightRegular,
  ArrowLeftRegular,
  DismissRegular,
  CheckmarkCircleRegular,
} from '@fluentui/react-icons'
import type { FlowChartData } from '../../types'

const useStyles = makeStyles({
  stepCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalL,
    padding: tokens.spacingVerticalXL,
    textAlign: 'center',
  },
  stepNumber: {
    fontSize: '14px',
    color: tokens.colorNeutralForeground3,
  },
  stepLabel: {
    fontSize: '20px',
    fontWeight: tokens.fontWeightBold,
  },
  stepDescription: {
    fontSize: '14px',
    color: tokens.colorNeutralForeground2,
    maxWidth: '400px',
  },
  progress: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
    justifyContent: 'center',
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: tokens.colorNeutralStroke2,
  },
  dotActive: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: 'var(--redi-teal)',
  },
  dotDone: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: 'var(--redi-coral)',
  },
  completeCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingVerticalXL,
    color: 'var(--redi-teal)',
  },
})

interface FlowChartWizardProps {
  data: FlowChartData | null
  onClose: () => void
}

/**
 * Interactive step-by-step wizard derived from the flowchart.
 * Walks through nodes in topological order, skipping start/end nodes
 * and presenting steps and decisions to the user.
 */
export default function FlowChartWizard({ data, onClose }: FlowChartWizardProps) {
  const styles = useStyles()

  // Build ordered step list from flowchart via topological walk
  const steps = useMemo(() => {
    if (!data || data.nodes.length === 0) return []

    // Build adjacency from edges
    const adj = new Map<string, string[]>()
    for (const edge of data.edges) {
      if (!adj.has(edge.source)) adj.set(edge.source, [])
      adj.get(edge.source)!.push(edge.target)
    }

    // Find start node
    const startNode = data.nodes.find((n) => n.type === 'start')
    if (!startNode) return data.nodes.filter((n) => n.type !== 'start' && n.type !== 'end')

    // BFS walk from start
    const visited = new Set<string>()
    const ordered: typeof data.nodes = []
    const queue = [startNode.id]
    while (queue.length > 0) {
      const nodeId = queue.shift()!
      if (visited.has(nodeId)) continue
      visited.add(nodeId)
      const node = data.nodes.find((n) => n.id === nodeId)
      if (node && node.type !== 'start' && node.type !== 'end') {
        ordered.push(node)
      }
      const neighbours = adj.get(nodeId) ?? []
      for (const nb of neighbours) {
        if (!visited.has(nb)) queue.push(nb)
      }
    }

    return ordered
  }, [data])

  const [currentStep, setCurrentStep] = useState(0)
  const isComplete = currentStep >= steps.length

  if (steps.length === 0) {
    return (
      <Dialog open onOpenChange={(_, d) => { if (!d.open) onClose() }}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Quick Start Wizard</DialogTitle>
            <DialogContent>
              <Text>No steps found in the flowchart.</Text>
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose}>Close</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={(_, d) => { if (!d.open) onClose() }}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Quick Start Wizard</DialogTitle>
          <DialogContent>
            {isComplete ? (
              <div className={styles.completeCard}>
                <CheckmarkCircleRegular style={{ fontSize: '48px' }} />
                <Text className={styles.stepLabel}>All Done!</Text>
                <Text className={styles.stepDescription}>
                  You have completed all steps in the quick start guide.
                </Text>
              </div>
            ) : (
              <div className={styles.stepCard}>
                <Text className={styles.stepNumber}>
                  Step {currentStep + 1} of {steps.length}
                </Text>
                <Text className={styles.stepLabel}>{steps[currentStep].data.label}</Text>
                {steps[currentStep].data.description && (
                  <Text className={styles.stepDescription}>
                    {steps[currentStep].data.description}
                  </Text>
                )}
                <div className={styles.progress}>
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className={
                        i < currentStep ? styles.dotDone :
                        i === currentStep ? styles.dotActive :
                        styles.dot
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
          <DialogActions>
            {isComplete ? (
              <Button appearance="primary" onClick={onClose}>
                Close
              </Button>
            ) : (
              <>
                <Button icon={<DismissRegular />} onClick={onClose}>
                  Exit
                </Button>
                <Button
                  icon={<ArrowLeftRegular />}
                  disabled={currentStep === 0}
                  onClick={() => setCurrentStep((s) => s - 1)}
                >
                  Back
                </Button>
                <Button
                  appearance="primary"
                  icon={<ArrowRightRegular />}
                  iconPosition="after"
                  onClick={() => setCurrentStep((s) => s + 1)}
                >
                  {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                </Button>
              </>
            )}
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
