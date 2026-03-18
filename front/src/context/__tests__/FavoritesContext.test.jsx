import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FavoritesProvider, useFavorites } from '../FavoritesContext'

function FavConsumer({ id }) {
  const { favs, toggle, isFav } = useFavorites()
  return (
    <div>
      <span data-testid="favs">{JSON.stringify(favs)}</span>
      <span data-testid="is-fav">{String(isFav(id))}</span>
      <button onClick={() => toggle(id)}>Toggle {id}</button>
    </div>
  )
}

describe('FavoritesContext', () => {
  beforeEach(() => localStorage.clear())

  it('starts with empty favorites', () => {
    render(<FavoritesProvider><FavConsumer id={1} /></FavoritesProvider>)
    expect(screen.getByTestId('favs').textContent).toBe('[]')
    expect(screen.getByTestId('is-fav').textContent).toBe('false')
  })

  it('loads favorites from localStorage', () => {
    localStorage.setItem('favs', JSON.stringify([5, 10]))
    render(<FavoritesProvider><FavConsumer id={5} /></FavoritesProvider>)
    expect(screen.getByTestId('is-fav').textContent).toBe('true')
  })

  it('adds a favorite on toggle', () => {
    render(<FavoritesProvider><FavConsumer id={42} /></FavoritesProvider>)
    fireEvent.click(screen.getByText('Toggle 42'))
    expect(screen.getByTestId('is-fav').textContent).toBe('true')
  })

  it('removes a favorite on second toggle', () => {
    render(<FavoritesProvider><FavConsumer id={42} /></FavoritesProvider>)
    fireEvent.click(screen.getByText('Toggle 42'))
    fireEvent.click(screen.getByText('Toggle 42'))
    expect(screen.getByTestId('is-fav').textContent).toBe('false')
  })

  it('persists favorites to localStorage', () => {
    render(<FavoritesProvider><FavConsumer id={7} /></FavoritesProvider>)
    fireEvent.click(screen.getByText('Toggle 7'))
    expect(JSON.parse(localStorage.getItem('favs'))).toContain(7)
  })
})
