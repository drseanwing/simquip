import {
  Button,
  makeStyles,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  tokens,
} from '@fluentui/react-components'

const useStyles = makeStyles({
  root: {
    padding: tokens.spacingVerticalL,
  },
})

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
}

export default function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: ErrorStateProps) {
  const styles = useStyles()
  return (
    <div className={styles.root}>
      <MessageBar intent="error">
        <MessageBarBody>
          <MessageBarTitle>{title}</MessageBarTitle>
          {message}
        </MessageBarBody>
        {onRetry && (
          <MessageBarActions>
            <Button onClick={onRetry}>Retry</Button>
          </MessageBarActions>
        )}
      </MessageBar>
    </div>
  )
}
