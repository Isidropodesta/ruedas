import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../../context/ThemeContext'
import { AuthProvider } from '../../context/AuthContext'
import { FavoritesProvider } from '../../context/FavoritesContext'
import Login from '../Login'

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// Mock api
vi.mock('../../api', () => ({
  login: vi.fn(),
  register: vi.fn(),
}))

import * as api from '../../api'

function renderLogin() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <AuthProvider>
          <FavoritesProvider>
            <Login />
          </FavoritesProvider>
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  )
}

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: false }),
    })
  })

  it('renders the RUEDAS logo', async () => {
    renderLogin()
    await waitFor(() => expect(screen.getByText('RUEDAS')).toBeInTheDocument())
  })

  it('renders login tab by default', async () => {
    renderLogin()
    await waitFor(() => expect(screen.getByText('Iniciar sesión')).toBeInTheDocument())
  })

  it('renders email and password fields', async () => {
    renderLogin()
    await waitFor(() => {
      expect(screen.getByPlaceholderText('tu@email.com')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
    })
  })

  it('switches to register mode on tab click', async () => {
    renderLogin()
    await waitFor(() => fireEvent.click(screen.getByText('Registrarse')))
    expect(screen.getByText('Nombre completo')).toBeInTheDocument()
    expect(screen.getByText('Crear cuenta')).toBeInTheDocument()
  })

  it('shows error when login fails', async () => {
    api.login.mockRejectedValue(new Error('Email o contraseña incorrectos'))
    renderLogin()
    await waitFor(() => expect(screen.getByPlaceholderText('tu@email.com')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), { target: { value: 'bad@email.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrongpass' } })
    fireEvent.click(screen.getByText('Ingresar'))

    await waitFor(() => expect(screen.getByText('Email o contraseña incorrectos')).toBeInTheDocument())
  })

  it('calls login API with correct credentials', async () => {
    api.login.mockResolvedValue({ data: { user: { id: 1, name: 'Test', role: 'cliente' }, token: 'tok' } })
    renderLogin()
    await waitFor(() => expect(screen.getByPlaceholderText('tu@email.com')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), { target: { value: 'test@email.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass123' } })
    fireEvent.click(screen.getByText('Ingresar'))

    await waitFor(() => expect(api.login).toHaveBeenCalledWith('test@email.com', 'pass123'))
  })

  it('navigates to /vehicles after cliente login', async () => {
    api.login.mockResolvedValue({ data: { user: { id: 3, name: 'Juan', role: 'cliente' }, token: 'tok' } })
    renderLogin()
    await waitFor(() => expect(screen.getByPlaceholderText('tu@email.com')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), { target: { value: 'juan@email.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'cliente123' } })
    fireEvent.click(screen.getByText('Ingresar'))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/vehicles'))
  })

  it('navigates to / after dueno login', async () => {
    api.login.mockResolvedValue({ data: { user: { id: 1, name: 'Admin', role: 'dueno' }, token: 'tok' } })
    renderLogin()
    await waitFor(() => expect(screen.getByPlaceholderText('tu@email.com')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), { target: { value: 'admin@ruedas.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'admin123' } })
    fireEvent.click(screen.getByText('Ingresar'))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'))
  })

  it('shows register validation error for missing name', async () => {
    renderLogin()
    await waitFor(() => fireEvent.click(screen.getByText('Registrarse')))
    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), { target: { value: 'new@email.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass123' } })
    fireEvent.click(screen.getByText('Crear cuenta'))

    await waitFor(() => expect(screen.getByText('El nombre es requerido')).toBeInTheDocument())
  })

  it('shows forgot password link in login mode', async () => {
    renderLogin()
    await waitFor(() => expect(screen.getByText('¿Olvidaste tu contraseña?')).toBeInTheDocument())
  })
})
