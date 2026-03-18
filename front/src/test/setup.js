import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Auto-cleanup after each test
afterEach(() => {
  cleanup()
  localStorage.clear()
})

// Mock import.meta.env
vi.stubGlobal('import', {
  meta: { env: { VITE_API_URL: '', DEV: false } },
})

// Mock window.location
Object.defineProperty(window, 'location', {
  value: { href: '', assign: vi.fn(), replace: vi.fn() },
  writable: true,
})

// Mock IntersectionObserver (used by some recharts/animation code)
global.IntersectionObserver = class {
  observe() {}
  disconnect() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class {
  observe() {}
  disconnect() {}
  unobserve() {}
}

// Silence recharts warnings in tests
global.SVGElement = class {}
