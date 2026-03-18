import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getVehicles } from '../api'

const BASE_URL = import.meta.env.VITE_API_URL || ''

function getPhotoUrl(photos) {
  if (!photos || photos.length === 0) return null
  const p = photos[0]
  if (typeof p === 'string') return p.startsWith('http') ? p : BASE_URL + p
  if (p && p.url) return p.url.startsWith('http') ? p.url : BASE_URL + p.url
  return null
}

function formatPrice(min, max) {
  const fmt = n => {
    const num = parseFloat(n)
    if (!num) return null
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
    if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`
    return `$${num.toFixed(0)}`
  }
  const fMin = fmt(min), fMax = fmt(max)
  if (fMin && fMax) return `${fMin} – ${fMax}`
  if (fMin) return `desde ${fMin}`
  if (fMax) return `hasta ${fMax}`
  return 'Sin precio'
}

const STATUS_LABELS = { available: 'Disponible', sold: 'Vendido', withdrawn: 'Retirado' }
const STATUS_COLORS = { available: 'var(--success)', sold: 'var(--info)', withdrawn: 'var(--text-muted)' }

export default function GlobalSearch() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const debounceRef = useRef(null)

  // Ctrl+K shortcut
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
        setResults([])
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  // Click outside closes
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
        setResults([])
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const doSearch = useCallback((q) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    getVehicles({ search: q })
      .then(res => setResults((res.data || []).slice(0, 6)))
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(val), 300)
  }

  const handleSelect = (id) => {
    navigate(`/vehicles/${id}`)
    setOpen(false)
    setQuery('')
    setResults([])
  }

  const handleOpen = () => {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {/* Search trigger button */}
      <button
        onClick={handleOpen}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--bg-card)',
          color: 'var(--text-muted)', fontSize: 12,
          cursor: 'pointer', transition: 'all 0.15s',
        }}
        title="Buscar (Ctrl+K)"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span style={{ display: 'none', '@media (min-width: 640px)': { display: 'inline' } }}>Buscar</span>
        <span style={{ fontSize: 10, opacity: 0.5, marginLeft: 2 }}>Ctrl+K</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 380, maxWidth: '90vw',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-md)',
          zIndex: 1000,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={handleChange}
              placeholder="Buscar vehículos..."
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--text)', fontSize: 14,
              }}
            />
            {loading && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>...</span>
            )}
          </div>

          {query && results.length === 0 && !loading && (
            <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Sin resultados para "{query}"
            </div>
          )}

          {results.length > 0 && (
            <div>
              {results.map(v => {
                const photo = getPhotoUrl(v.photos)
                return (
                  <button
                    key={v.id}
                    onClick={() => handleSelect(v.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', background: 'transparent', border: 'none',
                      cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border-soft)',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: 44, height: 34, borderRadius: 6, flexShrink: 0,
                      background: 'var(--bg)', overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {photo ? (
                        <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 16 }}>🚗</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {v.brand} {v.model} {v.year}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 1 }}>
                        {formatPrice(v.price_min, v.price_max)}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
                      background: `${STATUS_COLORS[v.status]}18`,
                      color: STATUS_COLORS[v.status], flexShrink: 0,
                    }}>
                      {STATUS_LABELS[v.status] || v.status}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {!query && (
            <div style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 12 }}>
              Escribí para buscar vehículos por marca o modelo...
            </div>
          )}
        </div>
      )}
    </div>
  )
}
