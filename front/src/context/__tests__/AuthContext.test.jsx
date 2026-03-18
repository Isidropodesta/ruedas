import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'

function AuthConsumer() {
  const { user, loading, login, logout } = useAuth()
  if (loading) return <span>loading...</span>
  return (
    <div>
      <span data-testid="user">{user ? user.name : 'guest'}</span>
      <button onClick={() => login({ id: 1, name: 'Test User', role: 'cliente' }, 'tok123')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('shows guest when no token', async () => {
    render(<AuthProvider><AuthConsumer /></AuthProvider>)
    await waitFor(() => expect(screen.queryByText('loading...')).toBeNull())
    expect(screen.getByTestId('user').textContent).toBe('guest')
  })

  it('fetches user when token exists in localStorage', async () => {
    localStorage.setItem('token', 'valid-token')
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { id: 1, name: 'Admin', role: 'dueno' } }),
    })
    render(<AuthProvider><AuthConsumer /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Admin'))
  })

  it('clears token when /auth/me returns failure', async () => {
    localStorage.setItem('token', 'expired-token')
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: false }),
    })
    render(<AuthProvider><AuthConsumer /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('guest'))
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('login() sets user and token in localStorage', async () => {
    render(<AuthProvider><AuthConsumer /></AuthProvider>)
    await waitFor(() => expect(screen.queryByText('loading...')).toBeNull())
    fireEvent.click(screen.getByText('Login'))
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Test User'))
    expect(localStorage.getItem('token')).toBe('tok123')
  })

  it('logout() clears user and token', async () => {
    render(<AuthProvider><AuthConsumer /></AuthProvider>)
    await waitFor(() => expect(screen.queryByText('loading...')).toBeNull())
    fireEvent.click(screen.getByText('Login'))
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Test User'))
    fireEvent.click(screen.getByText('Logout'))
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('guest'))
    expect(localStorage.getItem('token')).toBeNull()
  })
})
