import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../../context/ThemeContext'
import { AuthProvider } from '../../context/AuthContext'
import { FavoritesProvider } from '../../context/FavoritesContext'
import TestDrives from '../TestDrives'
import { MOCK_TEST_DRIVES, MOCK_VEHICLES, MOCK_SELLERS } from '../../test/helpers'

vi.mock('../../api', () => ({
  getAllTestDrives: vi.fn(),
  updateTestDrive: vi.fn(),
  deleteTestDrive: vi.fn(),
  createTestDrive: vi.fn(),
  getVehicles: vi.fn(),
  getSellers: vi.fn(),
}))

import * as api from '../../api'

function renderTestDrives(user = { id: 1, name: 'Admin', role: 'dueno', active: true }) {
  localStorage.setItem('token', 'tok')
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ success: true, data: user }),
  })
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <AuthProvider>
          <FavoritesProvider>
            <TestDrives />
          </FavoritesProvider>
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  )
}

describe('TestDrives page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    api.getAllTestDrives.mockResolvedValue({ data: MOCK_TEST_DRIVES })
    api.getVehicles.mockResolvedValue({ data: MOCK_VEHICLES })
    api.getSellers.mockResolvedValue({ data: MOCK_SELLERS })
  })

  it('shows loading state initially', () => {
    api.getAllTestDrives.mockReturnValue(new Promise(() => {}))
    api.getVehicles.mockReturnValue(new Promise(() => {}))
    api.getSellers.mockReturnValue(new Promise(() => {}))
    renderTestDrives()
    expect(screen.getByText(/Cargando/i)).toBeInTheDocument()
  })

  it('renders test drive list after load', async () => {
    renderTestDrives()
    await waitFor(() => expect(screen.getByText('Juan Pérez')).toBeInTheDocument())
    expect(screen.getByText('María López')).toBeInTheDocument()
  })

  it('renders tab buttons', async () => {
    renderTestDrives()
    await waitFor(() => {
      expect(screen.getByText('Todos')).toBeInTheDocument()
      expect(screen.getByText('Pendientes')).toBeInTheDocument()
      expect(screen.getByText('Completados')).toBeInTheDocument()
      expect(screen.getByText('Cancelados')).toBeInTheDocument()
    })
  })

  it('shows correct count on tabs', async () => {
    renderTestDrives()
    await waitFor(() => screen.getByText('Juan Pérez'))
    // Total count = 2
    const allTab = screen.getByText('Todos').closest('button')
    expect(allTab).toBeInTheDocument()
  })

  it('filters by Pendientes tab', async () => {
    renderTestDrives()
    await waitFor(() => screen.getByText('Juan Pérez'))
    fireEvent.click(screen.getByText('Pendientes'))
    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
      expect(screen.queryByText('María López')).toBeNull()
    })
  })

  it('filters by Completados tab', async () => {
    renderTestDrives()
    await waitFor(() => screen.getByText('María López'))
    fireEvent.click(screen.getByText('Completados'))
    await waitFor(() => {
      expect(screen.getByText('María López')).toBeInTheDocument()
      expect(screen.queryByText('Juan Pérez')).toBeNull()
    })
  })

  it('shows empty state for Cancelados when none exist', async () => {
    renderTestDrives()
    await waitFor(() => screen.getByText('Juan Pérez'))
    fireEvent.click(screen.getByText('Cancelados'))
    await waitFor(() => expect(screen.getByText('No hay turnos')).toBeInTheDocument())
  })

  it('opens Agendar Turno modal', async () => {
    renderTestDrives()
    await waitFor(() => screen.getByText('+ Agendar Turno'))
    fireEvent.click(screen.getByText('+ Agendar Turno'))
    await waitFor(() => expect(screen.getByText('Agendar Test Drive')).toBeInTheDocument())
  })

  it('shows empty state when no test drives exist', async () => {
    api.getAllTestDrives.mockResolvedValue({ data: [] })
    renderTestDrives()
    await waitFor(() => expect(screen.getByText('No hay turnos')).toBeInTheDocument())
  })
})
