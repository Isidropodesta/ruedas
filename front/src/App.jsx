import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Vehicles from './pages/Vehicles'
import VehicleDetail from './pages/VehicleDetail'
import AddVehicle from './pages/AddVehicle'
import Sellers from './pages/Sellers'
import SellerDetail from './pages/SellerDetail'
import AddSeller from './pages/AddSeller'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/vehicles" element={<Vehicles />} />
          <Route path="/vehicles/new" element={<AddVehicle />} />
          <Route path="/vehicles/:id" element={<VehicleDetail />} />
          <Route path="/sellers" element={<Sellers />} />
          <Route path="/sellers/new" element={<AddSeller />} />
          <Route path="/sellers/:id" element={<SellerDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
