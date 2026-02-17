import {
  makeStyles,
  shorthands,
  Tab,
  TabList,
  type SelectTabData,
  type SelectTabEvent,
} from '@fluentui/react-components'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

const navItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/equipment', label: 'Equipment' },
  { path: '/locations', label: 'Locations' },
  { path: '/people', label: 'People' },
  { path: '/teams', label: 'Teams' },
  { path: '/loans', label: 'Loans' },
]

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
  header: {
    backgroundColor: 'var(--redi-navy)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('0px'),
    flexWrap: 'wrap',
  },
  titleBlock: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('12px'),
    paddingLeft: '20px',
    paddingRight: '16px',
    paddingTop: '10px',
    paddingBottom: '10px',
  },
  logo: {
    width: '36px',
    height: '36px',
    borderRadius: '6px',
  },
  title: {
    fontFamily: "'Montserrat', sans-serif",
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: '-0.01em',
    whiteSpace: 'nowrap' as const,
  },
  titleAccent: {
    color: 'var(--redi-coral)',
  },
  navArea: {
    flex: 1,
    minWidth: 0,
  },
  gradientBar: {
    height: '4px',
    background:
      'linear-gradient(90deg, var(--redi-lime) 0%, var(--redi-teal) 50%, var(--redi-navy) 100%)',
  },
  content: {
    flex: 1,
    ...shorthands.padding('20px', '24px'),
    backgroundColor: 'var(--redi-light-gray)',
  },
})

function resolveSelectedTab(pathname: string): string {
  if (pathname.startsWith('/equipment')) return '/equipment'
  if (pathname.startsWith('/locations')) return '/locations'
  if (pathname.startsWith('/people')) return '/people'
  if (pathname.startsWith('/teams')) return '/teams'
  if (pathname.startsWith('/loans')) return '/loans'
  return '/'
}

export default function AppShell() {
  const styles = useStyles()
  const location = useLocation()
  const navigate = useNavigate()
  const selectedTab = resolveSelectedTab(location.pathname)

  const handleTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    void navigate(data.value as string)
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <img src="./icons/icon-192.png" alt="SimQuip logo" className={styles.logo} />
          <span className={styles.title}>
            Sim<span className={styles.titleAccent}>Quip</span>
          </span>
        </div>
        <nav className={styles.navArea}>
          <TabList
            selectedValue={selectedTab}
            onTabSelect={handleTabSelect}
            appearance="subtle"
            size="large"
          >
            {navItems.map((item) => (
              <Tab key={item.path} value={item.path}>
                {item.label}
              </Tab>
            ))}
          </TabList>
        </nav>
      </header>
      <div className={styles.gradientBar} />
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}
