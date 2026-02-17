import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppShell from './components/AppShell'
import DashboardPage from './pages/DashboardPage'
import EquipmentListPage from './pages/EquipmentListPage'
import EquipmentDetailPage from './pages/EquipmentDetailPage'
import EquipmentCreatePage from './pages/EquipmentCreatePage'
import EquipmentEditPage from './pages/EquipmentEditPage'
import LocationsPage from './pages/LocationsPage'
import TeamsPage from './pages/TeamsPage'
import LoansPage from './pages/LoansPage'

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
          <Route path="teams" element={<TeamsPage />} />
          <Route path="loans" element={<LoansPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
