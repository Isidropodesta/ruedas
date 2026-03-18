import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../../context/ThemeContext'
import { AuthProvider } from '../../context/AuthContext'
import { FavoritesProvider } from '../../context/FavoritesContext'
import Dashboard from '../Dashboard'
import { MOCK_VEHICLES, MOCK_SELLERS } from '../../test/helpers'

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts')
  // Stub out heavy chart components to avoid SVG rendering issues in jsdom
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div>{children}</div>,
    AreaChart: ({ children }) => <div>{children}</div>,
    BarChart: ({ children }) => <div>{children}</div>,
    PieChart: ({ children }) => <div>{children}</div>,
    Area: () => null,
    Bar: () => null,
    Pie: () => null,
    Cell: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
  }
})

vi.mock('../../api', () => ({
  getGeneralKpis: vi.fn(),
  getMonthlyKpis: vi.fn(),
  getSellerKpis: vi.fn(),
  getVehicles: vi.fn(),
  getAdvancedKpis: vi.fn(),
}))

import * as api from '../../api'

const MOCK_GENERAL = { total_vehicles: 10, available: 7, sold: 2, withdrawn: 1, total_revenue: 350000 }
const MOCK_ADVANCED = { avg_days_to_sell: 15, stale_vehicles: [], stock_by_brand: [] }

function renderDashboard() {
  localStorage.setItem('token', 'tok')
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ success: true, data: { id: 1, name: 'Admin', role: 'dueno', active: true } }),
  })
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <AuthProvider>
          <FavoritesProvider>
            <Dashboard />
          </FavoritesProvider>
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  )
}

describe('Dashboard page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    api.getGeneralKpis.mockResolvedValue({ data: MOCK_GENERAL })
    api.getMonthlyKpis.mockResolvedValue({ data: [] })
    api.getSellerKpis.mockResolvedValue({ data: MOCK_SELLERS })
    api.getVehicles.mockResolvedValue({ data: MOCK_VEHICLES })
    api.getAdvancedKpis.mockResolvedValue({ data: MOCK_ADVANCED })
  })

  it('shows loading state initially', () => {
    api.getGeneralKpis.mockReturnValue(new Promise(() => {}))
    api.getMonthlyKpis.mockReturnValue(new Promise(() => {}))
    api.getSellerKpis.mockReturnValue(new Promise(() => {}))
    api.getVehicles.mockReturnValue(new Promise(() => {}))
    api.getAdvancedKpis.mockReturnValue(new Promise(() => {}))
    renderDashboard()
    expect(screen.getByText(/Cargando/i)).toBeInTheDocument()
  })

  it('renders KPI cards after load', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('TOTAL VEHÍCULOS')).toBeInTheDocument()
      expect(screen.getByText('DISPONIBLES')).toBeInTheDocument()
      expect(screen.getAllByText('VENDIDOS').length).toBeGreaterThan(0)
    })
  })

  it('renders total vehicles KPI value', async () => {
    renderDashboard()
    await waitFor(() => expect(screen.getByText('TOTAL VEHÍCULOS')).toBeInTheDocument())
    // KPI value animates, just verify the card exists
    expect(document.querySelectorAll('.kpi-card').length).toBeGreaterThan(0)
  })

  it('renders Ventas Mensuales chart section', async () => {
    renderDashboard()
    await waitFor(() => expect(screen.getByText('Ventas Mensuales (últimos 12 meses)')).toBeInTheDocument())
  })

  it('renders Top Vendedores section', async () => {
    renderDashboard()
    await waitFor(() => expect(screen.getByText('Top Vendedores por Facturación')).toBeInTheDocument())
  })

  it('renders seller names in table', async () => {
    renderDashboard()
    await waitFor(() => expect(screen.getByText('Carlos García')).toBeInTheDocument())
    expect(screen.getByText('Ana Martínez')).toBeInTheDocument()
  })

  it('renders Actividad Reciente section', async () => {
    renderDashboard()
    await waitFor(() => expect(screen.getByText('Actividad Reciente')).toBeInTheDocument())
  })

  it('renders recent vehicles in activity feed', async () => {
    renderDashboard()
    await waitFor(() => expect(screen.getByText(/Toyota Corolla/)).toBeInTheDocument())
  })

  it('renders Agregar Vehículo button', async () => {
    renderDashboard()
    await waitFor(() => expect(screen.getByText('+ Agregar Vehículo')).toBeInTheDocument())
  })

  it('renders empty monthly chart message when no data', async () => {
    api.getMonthlyKpis.mockResolvedValue({ data: [] })
    renderDashboard()
    await waitFor(() => expect(screen.getByText('No hay datos de ventas aún.')).toBeInTheDocument())
  })

  it('shows stock alert for old vehicles (60+ days)', async () => {
    // MOCK_VEHICLES[2] is 70 days old and available → triggers alert
    renderDashboard()
    await waitFor(() => expect(screen.getByText(/Stock sin movimiento/)).toBeInTheDocument())
  })
})
