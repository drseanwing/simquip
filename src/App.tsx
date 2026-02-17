import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppShell from './components/AppShell'
import DashboardPage from './pages/DashboardPage'
import EquipmentListPage from './pages/EquipmentListPage'
import EquipmentDetailPage from './pages/EquipmentDetailPage'
import EquipmentCreatePage from './pages/EquipmentCreatePage'
import EquipmentEditPage from './pages/EquipmentEditPage'
import LocationsPage from './pages/LocationsPage'
import LocationDetailPage from './pages/LocationDetailPage'
import TeamsPage from './pages/TeamsPage'
import TeamDetailPage from './pages/TeamDetailPage'
import TeamCreatePage from './pages/TeamCreatePage'
import LoansPage from './pages/LoansPage'
import LoanDetailPage from './pages/LoanDetailPage'
import LoanCreatePage from './pages/LoanCreatePage'

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  )
}
