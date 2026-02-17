import {
  makeStyles,
  tokens,
  Tab,
  TabList,
  Title3,
  type SelectTabData,
  type SelectTabEvent,
} from '@fluentui/react-components'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

const navItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/equipment', label: 'Equipment' },
  { path: '/locations', label: 'Locations' },
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
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalL,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  title: {
    whiteSpace: 'nowrap',
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
  },
  content: {
    flex: 1,
    padding: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground2,
  },
})

function resolveSelectedTab(pathname: string): string {
  if (pathname.startsWith('/equipment')) return '/equipment'
  if (pathname.startsWith('/locations')) return '/locations'
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
        <Title3 className={styles.title}>SimQuip</Title3>
        <TabList selectedValue={selectedTab} onTabSelect={handleTabSelect}>
          {navItems.map((item) => (
            <Tab key={item.path} value={item.path}>
              {item.label}
            </Tab>
          ))}
        </TabList>
      </header>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}
