import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatusBadge from '../StatusBadge'

describe('StatusBadge', () => {
  it('renders "Disponible" for available', () => {
    render(<StatusBadge status="available" />)
    expect(screen.getByText('Disponible')).toBeInTheDocument()
  })

  it('renders "Vendido" for sold', () => {
    render(<StatusBadge status="sold" />)
    expect(screen.getByText('Vendido')).toBeInTheDocument()
  })

  it('renders "Retirado" for withdrawn', () => {
    render(<StatusBadge status="withdrawn" />)
    expect(screen.getByText('Retirado')).toBeInTheDocument()
  })

  it('renders raw status for unknown value', () => {
    render(<StatusBadge status="unknown_status" />)
    expect(screen.getByText('unknown_status')).toBeInTheDocument()
  })

  it('applies correct CSS class for available', () => {
    const { container } = render(<StatusBadge status="available" />)
    expect(container.querySelector('.status-badge.available')).toBeInTheDocument()
  })

  it('applies correct CSS class for sold', () => {
    const { container } = render(<StatusBadge status="sold" />)
    expect(container.querySelector('.status-badge.sold')).toBeInTheDocument()
  })

  it('applies correct CSS class for withdrawn', () => {
    const { container } = render(<StatusBadge status="withdrawn" />)
    expect(container.querySelector('.status-badge.withdrawn')).toBeInTheDocument()
  })

  it('renders the status dot', () => {
    const { container } = render(<StatusBadge status="available" />)
    expect(container.querySelector('.status-dot')).toBeInTheDocument()
  })
})
