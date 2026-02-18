import { makeStyles, Spinner, tokens } from '@fluentui/react-components'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacingVerticalXXL,
  },
})

interface LoadingStateProps {
  label?: string
}

export default function LoadingState({ label = 'Loading...' }: LoadingStateProps) {
  const styles = useStyles()
  return (
    <div className={styles.root}>
      <Spinner label={label} />
    </div>
  )
}
