import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../../context/ThemeContext'
import ForgotPassword from '../ForgotPassword'

function renderForgot() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <ForgotPassword />
      </ThemeProvider>
    </MemoryRouter>
  )
}

describe('ForgotPassword page', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders heading', () => {
    renderForgot()
    expect(screen.getByText(/Recuperar contraseña/i)).toBeInTheDocument()
  })

  it('renders email input', () => {
    renderForgot()
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
  })

  it('shows success message after submission', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    })
    renderForgot()
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'test@email.com' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }))
    await waitFor(() => expect(screen.getByText(/enlace/i)).toBeInTheDocument())
  })

  it('shows error on API failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Error del servidor' }),
    })
    renderForgot()
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'test@email.com' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }))
    await waitFor(() => expect(screen.getByText('Error del servidor')).toBeInTheDocument())
  })
})
