import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import AppShell from './components/AppShell'
import SplashScreen from './components/SplashScreen'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const EquipmentListPage = lazy(() => import('./pages/EquipmentListPage'))
const EquipmentDetailPage = lazy(() => import('./pages/EquipmentDetailPage'))
const EquipmentCreatePage = lazy(() => import('./pages/EquipmentCreatePage'))
const EquipmentEditPage = lazy(() => import('./pages/EquipmentEditPage'))
const LocationsPage = lazy(() => import('./pages/LocationsPage'))
const LocationDetailPage = lazy(() => import('./pages/LocationDetailPage'))
const PeoplePage = lazy(() => import('./pages/PeoplePage'))
const TeamsPage = lazy(() => import('./pages/TeamsPage'))
const TeamDetailPage = lazy(() => import('./pages/TeamDetailPage'))
const TeamCreatePage = lazy(() => import('./pages/TeamCreatePage'))
const TeamEditPage = lazy(() => import('./pages/TeamEditPage'))
const LoansPage = lazy(() => import('./pages/LoansPage'))
const LoanDetailPage = lazy(() => import('./pages/LoanDetailPage'))
const LoanCreatePage = lazy(() => import('./pages/LoanCreatePage'))
const IssueListPage = lazy(() => import('./pages/IssueListPage'))
const IssueDetailPage = lazy(() => import('./pages/IssueDetailPage'))
const IssueCreatePage = lazy(() => import('./pages/IssueCreatePage'))
const PMListPage = lazy(() => import('./pages/PMListPage'))
const PMCreatePage = lazy(() => import('./pages/PMCreatePage'))
const PMDetailPage = lazy(() => import('./pages/PMDetailPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

export default function App() {
  return (
    <HashRouter>
      <Suspense fallback={<SplashScreen />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="equipment" element={<EquipmentListPage />} />
            <Route path="equipment/new" element={<EquipmentCreatePage />} />
            <Route path="equipment/:id" element={<EquipmentDetailPage />} />
            <Route path="equipment/:id/edit" element={<EquipmentEditPage />} />
            <Route path="locations" element={<LocationsPage />} />
            <Route path="locations/:id" element={<LocationDetailPage />} />
            <Route path="people" element={<PeoplePage />} />
            <Route path="teams" element={<TeamsPage />} />
            <Route path="teams/new" element={<TeamCreatePage />} />
            <Route path="teams/:id" element={<TeamDetailPage />} />
            <Route path="teams/:id/edit" element={<TeamEditPage />} />
            <Route path="loans" element={<LoansPage />} />
            <Route path="loans/new" element={<LoanCreatePage />} />
            <Route path="loans/:id" element={<LoanDetailPage />} />
            <Route path="issues" element={<IssueListPage />} />
            <Route path="issues/new" element={<IssueCreatePage />} />
            <Route path="issues/:id" element={<IssueDetailPage />} />
            <Route path="maintenance" element={<PMListPage />} />
            <Route path="maintenance/new" element={<PMCreatePage />} />
            <Route path="maintenance/:id" element={<PMDetailPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
