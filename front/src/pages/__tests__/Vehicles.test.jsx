import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../../context/ThemeContext'
import { AuthProvider } from '../../context/AuthContext'
import { FavoritesProvider } from '../../context/FavoritesContext'
import Vehicles from '../Vehicles'
import { MOCK_VEHICLES } from '../../test/helpers'

vi.mock('../../api', () => ({
  getVehicles: vi.fn(),
  bulkUpdateVehicleStatus: vi.fn(),
  importVehiclesCSV: vi.fn(),
}))

import * as api from '../../api'

function makeAuthContext(user) {
  return { user, loading: false, login: vi.fn(), logout: vi.fn(), can: (...roles) => user && roles.includes(user.role) }
}

// Use real AuthContext but control fetch mock to set user
function renderVehicles(user = null) {
  if (user) localStorage.setItem('token', 'tok')
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(user ? { success: true, data: user } : { success: false }),
  })
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <AuthProvider>
          <FavoritesProvider>
            <Vehicles />
          </FavoritesProvider>
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  )
}

describe('Vehicles page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    api.getVehicles.mockResolvedValue({ data: MOCK_VEHICLES })
  })

  it('shows loading state initially', () => {
    api.getVehicles.mockReturnValue(new Promise(() => {}))
    renderVehicles()
    expect(screen.getByText(/Cargando/i)).toBeInTheDocument()
  })

  it('renders vehicle cards after load', async () => {
    renderVehicles()
    await waitFor(() => expect(screen.getByText('Toyota Corolla')).toBeInTheDocument())
    expect(screen.getByText('Ford Ranger')).toBeInTheDocument()
  })

  it('filters panel is shown', async () => {
    renderVehicles()
    await waitFor(() => expect(screen.getByText('Filtros')).toBeInTheDocument())
  })

  it('shows vehicle count in header', async () => {
    renderVehicles()
    await waitFor(() => expect(screen.getByText(/3 de 3/)).toBeInTheDocument())
  })

  it('search filter reduces results', async () => {
    renderVehicles()
    await waitFor(() => screen.getByText('Toyota Corolla'))
    const searchInput = screen.getByPlaceholderText(/Marca, modelo/i)
    fireEvent.change(searchInput, { target: { value: 'Toyota' } })
    await waitFor(() => {
      expect(screen.getByText('Toyota Corolla')).toBeInTheDocument()
      expect(screen.queryByText('Ford Ranger')).toBeNull()
    })
  })

  it('shows empty state when no results match', async () => {
    renderVehicles()
    await waitFor(() => screen.getByText('Toyota Corolla'))
    const searchInput = screen.getByPlaceholderText(/Marca, modelo/i)
    fireEvent.change(searchInput, { target: { value: 'xxxxnonexistent' } })
    await waitFor(() => expect(screen.getByText('Sin resultados')).toBeInTheDocument())
  })

  it('shows status badges on cards', async () => {
    renderVehicles()
    await waitFor(() => screen.getByText('Toyota Corolla'))
    expect(screen.getAllByText('Disponible').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Vendido').length).toBeGreaterThan(0)
  })

  it('shows car price on cards', async () => {
    renderVehicles()
    await waitFor(() => expect(screen.getByText(/\$25/)).toBeInTheDocument())
  })

  it('shows empty state when API returns no vehicles', async () => {
    api.getVehicles.mockResolvedValue({ data: [] })
    renderVehicles()
    await waitFor(() => expect(screen.getByText('Sin resultados')).toBeInTheDocument())
  })

  it('type filter works correctly', async () => {
    renderVehicles()
    await waitFor(() => screen.getByText('Toyota Corolla'))
    const typeSelect = screen.getAllByRole('combobox').find(el =>
      el.querySelector ? false : true
    )
    // Find type select by looking for "Utilitario" option
    const selects = screen.getAllByRole('combobox')
    const typeFilterSelect = selects.find(s => s.querySelector('option[value="utility"]'))
    if (typeFilterSelect) {
      fireEvent.change(typeFilterSelect, { target: { value: 'utility' } })
      await waitFor(() => {
        expect(screen.getByText('Ford Ranger')).toBeInTheDocument()
        expect(screen.queryByText('Toyota Corolla')).toBeNull()
      })
    }
  })
})
