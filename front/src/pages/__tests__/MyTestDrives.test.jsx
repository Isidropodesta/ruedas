import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../../context/ThemeContext'
import { AuthProvider } from '../../context/AuthContext'
import { FavoritesProvider } from '../../context/FavoritesContext'
import MyTestDrives from '../MyTestDrives'
import { MOCK_TEST_DRIVES } from '../../test/helpers'

vi.mock('../../api', () => ({
  getMyTestDrives: vi.fn(),
  cancelMyTestDrive: vi.fn(),
}))
import * as api from '../../api'

function renderMyTestDrives(role = 'cliente') {
  localStorage.setItem('token', 'tok')
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ success: true, data: { id: 3, name: 'Juan', role, active: true, company_id: 1 } }),
  })
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <AuthProvider>
          <FavoritesProvider>
            <MyTestDrives />
          </FavoritesProvider>
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  )
}

describe('MyTestDrives page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    api.getMyTestDrives.mockResolvedValue({ data: MOCK_TEST_DRIVES })
  })

  it('shows loading state', async () => {
    api.getMyTestDrives.mockReturnValue(new Promise(() => {}))
    renderMyTestDrives()
    // Wait for auth to resolve (user set), then component shows loading for test drives
    await waitFor(() => expect(screen.getByText(/Cargando/i)).toBeInTheDocument())
  })

  it('renders test drives after load', async () => {
    renderMyTestDrives()
    await waitFor(() => expect(screen.getByText(/Toyota Corolla/)).toBeInTheDocument())
    expect(screen.getByText(/Ford Ranger/)).toBeInTheDocument()
  })

  it('shows cancel button for pending drives', async () => {
    renderMyTestDrives()
    await waitFor(() => screen.getByText(/Toyota Corolla/))
    expect(screen.getByText(/Cancelar/i)).toBeInTheDocument()
  })

  it('does not show cancel button for completed drives', async () => {
    api.getMyTestDrives.mockResolvedValue({
      data: [{ ...MOCK_TEST_DRIVES[1], status: 'completed' }],
    })
    renderMyTestDrives()
    await waitFor(() => screen.getByText(/Ford Ranger/))
    const cancelButtons = screen.queryAllByText(/Cancelar turno/i)
    expect(cancelButtons.length).toBe(0)
  })

  it('shows empty state when no drives', async () => {
    api.getMyTestDrives.mockResolvedValue({ data: [] })
    renderMyTestDrives()
    await waitFor(() => expect(screen.getByText('Sin turnos aún')).toBeInTheDocument())
  })

  it('calls cancelMyTestDrive on confirmation', async () => {
    api.cancelMyTestDrive.mockResolvedValue({ data: { ...MOCK_TEST_DRIVES[0], status: 'cancelled' } })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderMyTestDrives()
    await waitFor(() => screen.getByText(/Toyota Corolla/))
    fireEvent.click(screen.getByText(/Cancelar turno/i))
    await waitFor(() => expect(api.cancelMyTestDrive).toHaveBeenCalledWith(1))
  })

  it('does not cancel when confirm is dismissed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderMyTestDrives()
    await waitFor(() => screen.getByText(/Toyota Corolla/))
    fireEvent.click(screen.getByText(/Cancelar turno/i))
    expect(api.cancelMyTestDrive).not.toHaveBeenCalled()
  })
})
