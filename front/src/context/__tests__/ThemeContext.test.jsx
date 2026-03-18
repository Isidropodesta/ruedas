import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider, useTheme } from '../ThemeContext'

function ThemeConsumer() {
  const { theme, toggle } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggle}>Toggle</button>
    </div>
  )
}

describe('ThemeContext', () => {
  beforeEach(() => localStorage.clear())

  it('defaults to dark theme', () => {
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)
    expect(screen.getByTestId('theme').textContent).toBe('dark')
  })

  it('reads saved theme from localStorage', () => {
    localStorage.setItem('theme', 'light')
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)
    expect(screen.getByTestId('theme').textContent).toBe('light')
  })

  it('toggles from dark to light', () => {
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)
    fireEvent.click(screen.getByText('Toggle'))
    expect(screen.getByTestId('theme').textContent).toBe('light')
  })

  it('toggles from light back to dark', () => {
    localStorage.setItem('theme', 'light')
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)
    fireEvent.click(screen.getByText('Toggle'))
    expect(screen.getByTestId('theme').textContent).toBe('dark')
  })

  it('persists theme to localStorage on toggle', () => {
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)
    fireEvent.click(screen.getByText('Toggle'))
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('sets data-theme attribute on documentElement', () => {
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })
})
