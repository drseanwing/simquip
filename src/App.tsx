import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Spinner } from '@fluentui/react-components'
import AppShell from './components/AppShell'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const EquipmentListPage = lazy(() => import('./pages/EquipmentListPage'))
const EquipmentDetailPage = lazy(() => import('./pages/EquipmentDetailPage'))
const EquipmentCreatePage = lazy(() => import('./pages/EquipmentCreatePage'))
const EquipmentEditPage = lazy(() => import('./pages/EquipmentEditPage'))
const LocationsPage = lazy(() => import('./pages/LocationsPage'))
const LocationDetailPage = lazy(() => import('./pages/LocationDetailPage'))
const TeamsPage = lazy(() => import('./pages/TeamsPage'))
const TeamDetailPage = lazy(() => import('./pages/TeamDetailPage'))
const TeamCreatePage = lazy(() => import('./pages/TeamCreatePage'))
const LoansPage = lazy(() => import('./pages/LoansPage'))
const LoanDetailPage = lazy(() => import('./pages/LoanDetailPage'))
const LoanCreatePage = lazy(() => import('./pages/LoanCreatePage'))

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Spinner size="large" label="Loading..." />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="equipment" element={<EquipmentListPage />} />
            <Route path="equipment/new" element={<EquipmentCreatePage />} />
            <Route path="equipment/:id" element={<EquipmentDetailPage />} />
            <Route path="equipment/:id/edit" element={<EquipmentEditPage />} />
            <Route path="locations" element={<LocationsPage />} />
            <Route path="locations/:id" element={<LocationDetailPage />} />
            <Route path="teams" element={<TeamsPage />} />
            <Route path="teams/new" element={<TeamCreatePage />} />
            <Route path="teams/:id" element={<TeamDetailPage />} />
            <Route path="loans" element={<LoansPage />} />
            <Route path="loans/new" element={<LoanCreatePage />} />
            <Route path="loans/:id" element={<LoanDetailPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
