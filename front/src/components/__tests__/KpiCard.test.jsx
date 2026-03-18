import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import KpiCard from '../KpiCard'

describe('KpiCard', () => {
  const baseProps = { icon: '🚗', label: 'TOTAL', value: 42, sub: 'En el sistema', color: 'blue' }

  it('renders the label', () => {
    render(<KpiCard {...baseProps} />)
    expect(screen.getByText('TOTAL')).toBeInTheDocument()
  })

  it('renders the subtitle', () => {
    render(<KpiCard {...baseProps} />)
    expect(screen.getByText('En el sistema')).toBeInTheDocument()
  })

  it('renders the icon', () => {
    render(<KpiCard {...baseProps} />)
    expect(screen.getByText('🚗')).toBeInTheDocument()
  })

  it('applies color class', () => {
    const { container } = render(<KpiCard {...baseProps} color="gold" />)
    expect(container.querySelector('.kpi-card-gold')).toBeInTheDocument()
  })

  it('shows positive trend with up arrow', () => {
    render(<KpiCard {...baseProps} trend={5} />)
    expect(screen.getByText(/↑/)).toBeInTheDocument()
    expect(screen.getByText(/5%/)).toBeInTheDocument()
  })

  it('shows negative trend with down arrow', () => {
    render(<KpiCard {...baseProps} trend={-3} />)
    expect(screen.getByText(/↓/)).toBeInTheDocument()
    expect(screen.getByText(/3%/)).toBeInTheDocument()
  })

  it('does not render trend when not provided', () => {
    render(<KpiCard {...baseProps} />)
    expect(screen.queryByText(/↑/)).toBeNull()
    expect(screen.queryByText(/↓/)).toBeNull()
  })

  it('renders currency prefix for isCurrency', () => {
    render(<KpiCard {...baseProps} value={1000} isCurrency />)
    const valueEl = document.querySelector('.kpi-value')
    expect(valueEl?.textContent).toMatch(/\$/)
  })

  it('renders orb element', () => {
    const { container } = render(<KpiCard {...baseProps} />)
    expect(container.querySelector('.kpi-orb')).toBeInTheDocument()
  })

  it('renders sparkline', () => {
    const { container } = render(<KpiCard {...baseProps} />)
    expect(container.querySelector('.kpi-sparkline')).toBeInTheDocument()
  })
})
