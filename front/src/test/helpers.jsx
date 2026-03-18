import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { ThemeProvider } from '../context/ThemeContext'
import { FavoritesProvider } from '../context/FavoritesContext'

/**
 * Renders a component wrapped with all app providers.
 * @param {React.ReactElement} ui
 * @param {{ route?: string, user?: object, token?: string }} options
 */
export function renderWithProviders(ui, { route = '/', user = null, token = null } = {}) {
  if (token) localStorage.setItem('token', token)

  return render(
    <MemoryRouter initialEntries={[route]}>
      <ThemeProvider>
        <AuthProvider>
          <FavoritesProvider>
            {ui}
          </FavoritesProvider>
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  )
}

// Pre-built mock users
export const MOCK_USERS = {
  dueno: { id: 1, name: 'Admin Ruedas', email: 'admin@ruedas.com', role: 'dueno', active: true },
  vendedor: { id: 2, name: 'Carlos Vendedor', email: 'carlos@ruedas.com', role: 'vendedor', active: true },
  cliente: { id: 3, name: 'Juan Cliente', email: 'juan@email.com', role: 'cliente', active: true },
}

// Pre-built mock vehicles
export const MOCK_VEHICLES = [
  {
    id: 1, brand: 'Toyota', model: 'Corolla', year: 2022, type: 'road',
    status: 'available', price_min: 25000, price_max: 28000, km: 15000,
    color: 'Blanco', photos: [{ id: 1, url: 'http://example.com/car.jpg' }],
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: 2, brand: 'Ford', model: 'Ranger', year: 2021, type: 'utility',
    status: 'sold', price_min: 35000, price_max: 38000, km: 40000,
    color: 'Gris', photos: [],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: 3, brand: 'Mercedes', model: 'GLA', year: 2023, type: 'luxury',
    status: 'available', price_min: 55000, price_max: 60000, km: 5000,
    color: 'Negro', photos: [],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 70).toISOString(),
  },
]

export const MOCK_SELLERS = [
  { id: 1, name: 'Carlos García', active: true, vehicles_sold: 12, total_revenue: 450000, avg_ticket: 37500, vehicles_sold_this_month: 2, vehicles_sold_this_year: 8 },
  { id: 2, name: 'Ana Martínez', active: true, vehicles_sold: 8, total_revenue: 280000, avg_ticket: 35000, vehicles_sold_this_month: 1, vehicles_sold_this_year: 5 },
]

export const MOCK_TEST_DRIVES = [
  { id: 1, vehicle_id: 1, brand: 'Toyota', model: 'Corolla', year: 2022, client_name: 'Juan Pérez', client_email: 'juan@test.com', client_phone: '1234567890', scheduled_at: new Date(Date.now() + 86400000).toISOString(), status: 'pending', notes: '' },
  { id: 2, vehicle_id: 2, brand: 'Ford', model: 'Ranger', year: 2021, client_name: 'María López', client_email: 'maria@test.com', client_phone: '9876543210', scheduled_at: new Date(Date.now() - 86400000).toISOString(), status: 'completed', notes: 'Muy interesada' },
]
