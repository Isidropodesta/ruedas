import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { FavoritesProvider } from './context/FavoritesContext'

const PING_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/vehicles?_ping=1`
  : null

function KeepAlive() {
  useEffect(() => {
    if (!PING_URL) return // local dev — no need
    const ping = () => fetch(PING_URL, { method: 'GET' }).catch(() => {})
    ping() // ping immediately on mount
    const id = setInterval(ping, 9 * 60 * 1000) // every 9 min
    return () => clearInterval(id)
  }, [])
  return null
}
import Layout from './components/Layout'
import Login from './pages/Login'
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
import Users from './pages/Users'
import Favorites from './pages/Favorites'
import MyTestDrives from './pages/MyTestDrives'
import Profile from './pages/Profile'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import TestDrivesCalendar from './pages/TestDrivesCalendar'

// Requires authentication; optionally restricts by role
function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">Cargando...</div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/vehicles" replace />
  return children
}

// Redirect already-logged users away from login
function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">Cargando...</div>
  if (user) return <Navigate to={user.role === 'cliente' ? '/vehicles' : '/'} replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public standalone routes */}
      <Route path="/public/vehicles/:id" element={<PublicVehicle />} />
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Routes with sidebar Layout */}
      <Route element={<Layout />}>
        {/* Public — no login required */}
        <Route path="/vehicles" element={<Vehicles />} />
        <Route path="/vehicles/:id" element={<VehicleDetail />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/favorites" element={<Favorites />} />

        {/* Authenticated — any role */}
        <Route path="/my-test-drives" element={<PrivateRoute><MyTestDrives /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

        {/* Vendedor + Dueño only */}
        <Route path="/" element={<PrivateRoute roles={['vendedor', 'dueno']}><Dashboard /></PrivateRoute>} />
        <Route path="/vehicles/new" element={<PrivateRoute roles={['vendedor', 'dueno']}><AddVehicle /></PrivateRoute>} />
        <Route path="/sellers" element={<PrivateRoute roles={['vendedor', 'dueno']}><Sellers /></PrivateRoute>} />
        <Route path="/sellers/new" element={<PrivateRoute roles={['vendedor', 'dueno']}><AddSeller /></PrivateRoute>} />
        <Route path="/sellers/:id" element={<PrivateRoute roles={['vendedor', 'dueno']}><SellerDetail /></PrivateRoute>} />
        <Route path="/test-drives" element={<PrivateRoute roles={['vendedor', 'dueno']}><TestDrives /></PrivateRoute>} />
        <Route path="/calendar" element={<PrivateRoute roles={['vendedor', 'dueno']}><TestDrivesCalendar /></PrivateRoute>} />

        {/* Dueño only */}
        <Route path="/users" element={<PrivateRoute roles={['dueno']}><Users /></PrivateRoute>} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/vehicles" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <FavoritesProvider>
          <AuthProvider>
            <KeepAlive />
            <AppRoutes />
          </AuthProvider>
        </FavoritesProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
