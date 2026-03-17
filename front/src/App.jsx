import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Vehicles from './pages/Vehicles'
import VehicleDetail from './pages/VehicleDetail'
import AddVehicle from './pages/AddVehicle'
import Sellers from './pages/Sellers'
import SellerDetail from './pages/SellerDetail'
import AddSeller from './pages/AddSeller'
import TestDrives from './pages/TestDrives'
import Compare from './pages/Compare'
import PublicVehicle from './pages/PublicVehicle'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public standalone route - no Layout */}
        <Route path="/public/vehicles/:id" element={<PublicVehicle />} />

        {/* App routes with sidebar Layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/vehicles" element={<Vehicles />} />
          <Route path="/vehicles/new" element={<AddVehicle />} />
          <Route path="/vehicles/:id" element={<VehicleDetail />} />
          <Route path="/sellers" element={<Sellers />} />
          <Route path="/sellers/new" element={<AddSeller />} />
          <Route path="/sellers/:id" element={<SellerDetail />} />
          <Route path="/test-drives" element={<TestDrives />} />
          <Route path="/compare" element={<Compare />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
