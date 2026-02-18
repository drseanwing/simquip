import { makeStyles, shorthands, Spinner } from '@fluentui/react-components'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: 'var(--redi-navy)',
    color: '#ffffff',
    fontFamily: "'Montserrat', 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif",
  },
  logoContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    ...shorthands.gap('20px'),
    animationName: {
      from: { opacity: 0, transform: 'translateY(12px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
    animationDuration: '0.5s',
    animationTimingFunction: 'ease-out',
    animationFillMode: 'both',
  },
  logo: {
    width: '96px',
    height: '96px',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    marginTop: '4px',
  },
  titleAccent: {
    color: 'var(--redi-coral)',
  },
  gradientBar: {
    width: '120px',
    height: '4px',
    borderRadius: '2px',
    background:
      'linear-gradient(90deg, var(--redi-lime) 0%, var(--redi-teal) 50%, var(--redi-navy-light) 100%)',
    marginTop: '4px',
  },
  spinnerArea: {
    marginTop: '32px',
  },
  versionLabel: {
    marginTop: '24px',
    fontSize: '0.7rem',
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
  },
})

export default function SplashScreen() {
  const styles = useStyles()
  const buildDate = new Date(__BUILD_TIME__)
  const buildStamp = `${buildDate.toLocaleDateString('en-AU')} ${buildDate.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`

  return (
    <div className={styles.root}>
      <div className={styles.logoContainer}>
        <img src="./icons/icon-512.png" alt="SimQuip logo" className={styles.logo} />
        <div className={styles.title}>
          Sim<span className={styles.titleAccent}>Quip</span>
        </div>
        <div className={styles.gradientBar} />
        <div className={styles.spinnerArea}>
          <Spinner size="small" appearance="inverted" />
        </div>
      </div>
      <div className={styles.versionLabel}>
        v{__APP_VERSION__} &middot; build {buildStamp}
      </div>
    </div>
  )
}
