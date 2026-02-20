import {
  makeStyles,
  shorthands,
  Tab,
  TabList,
  Text,
  type SelectTabData,
  type SelectTabEvent,
} from '@fluentui/react-components'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface NavItem {
  path: string
  label: string
  adminOnly: boolean
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', adminOnly: false },
  { path: '/equipment', label: 'Equipment', adminOnly: false },
  { path: '/issues', label: 'Issues', adminOnly: false },
  { path: '/maintenance', label: 'Maintenance', adminOnly: false },
  { path: '/locations', label: 'Locations', adminOnly: true },
  { path: '/people', label: 'People', adminOnly: true },
  { path: '/teams', label: 'Teams', adminOnly: true },
  { path: '/loans', label: 'Loans', adminOnly: false },
  { path: '/settings', label: 'Settings', adminOnly: true },
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
  userInfo: {
    paddingRight: '20px',
    paddingLeft: '8px',
    fontSize: '0.75rem',
    color: 'rgba(255, 255, 255, 0.8)',
    whiteSpace: 'nowrap' as const,
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
  if (pathname.startsWith('/issues')) return '/issues'
  if (pathname.startsWith('/maintenance')) return '/maintenance'
  if (pathname.startsWith('/locations')) return '/locations'
  if (pathname.startsWith('/people')) return '/people'
  if (pathname.startsWith('/teams')) return '/teams'
  if (pathname.startsWith('/loans')) return '/loans'
  if (pathname.startsWith('/settings')) return '/settings'
  return '/'
}

export default function AppShell() {
  const styles = useStyles()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const selectedTab = resolveSelectedTab(location.pathname)

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin)

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
            {visibleNavItems.map((item) => (
              <Tab key={item.path} value={item.path}>
                {item.label}
              </Tab>
            ))}
          </TabList>
        </nav>
        {user && (
          <Text className={styles.userInfo}>
            {user.fullName}{isAdmin ? ' (Admin)' : ''}
          </Text>
        )}
      </header>
      <div className={styles.gradientBar} />
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}
