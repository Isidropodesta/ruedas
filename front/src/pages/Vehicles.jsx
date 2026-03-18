import { useEffect, useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getVehicles, bulkUpdateVehicleStatus, importVehiclesCSV } from '../api'
import { useAuth } from '../context/AuthContext'
import { useFavorites } from '../context/FavoritesContext'
import StatusBadge from '../components/StatusBadge'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const typeLabels = { utility: 'Utilitario', road: 'Ruta', luxury: 'Lujo' }
const typeClass  = { utility: 'tag-utility', road: 'tag-road', luxury: 'tag-luxury' }

function getPhotoSrc(url) {
  if (!url) return ''
  if (typeof url === 'string' && !url.startsWith('http') && BASE_URL) return BASE_URL + url
  return url
}

const SORT_OPTIONS = [
  { value: 'newest',    label: 'Más nuevos primero' },
  { value: 'oldest',   label: 'Más antiguos primero' },
  { value: 'price_asc',  label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
  { value: 'year_desc',  label: 'Año: más reciente' },
  { value: 'year_asc',   label: 'Año: más antiguo' },
  { value: 'km_asc',     label: 'Km: menos primero' },
  { value: 'km_desc',    label: 'Km: más primero' },
]

const EMPTY_FILTERS = {
  search: '', status: '', type: '', brand: '',
  yearFrom: '', yearTo: '', priceFrom: '', priceTo: '',
  kmMax: '', color: '', sort: 'newest', onlyFavs: false,
}

function formatKm(km) {
  if (!km && km !== 0) return '-'
  return parseInt(km).toLocaleString('es-AR') + ' km'
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

function ChevronIcon({ open }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
      <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function exportCSV(vehicles) {
  const headers = ['Marca', 'Modelo', 'Año', 'Km', 'Precio Min', 'Precio Max', 'Color', 'Tipo', 'Estado']
  const statusLabels = { available: 'Disponible', sold: 'Vendido', withdrawn: 'Retirado' }
  const rows = vehicles.map(v => [
    v.brand || '',
    v.model || '',
    v.year || '',
    v.km || 0,
    v.price_min || '',
    v.price_max || '',
    v.color || '',
    typeLabels[v.type] || v.type || '',
    statusLabels[v.status] || v.status || '',
  ])
  const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'vehiculos.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function Vehicles() {
  const { user } = useAuth()
  const { toggle: toggleFav, isFav } = useFavorites()
  const [allVehicles, setAllVehicles] = useState([])
  const [loading, setLoading]         = useState(true)
  const [filters, setFilters]         = useState(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [selected, setSelected]       = useState(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult]   = useState(null)
  const csvInputRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    getVehicles()
      .then(res => setAllVehicles(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const set = (key, value) => setFilters(prev => ({ ...prev, [key]: value }))

  const clearFilters = () => setFilters(EMPTY_FILTERS)

  // Derive unique option lists from all vehicles
  const brands = useMemo(() => {
    const b = [...new Set(allVehicles.map(v => v.brand).filter(Boolean))].sort()
    return b
  }, [allVehicles])

  const colors = useMemo(() => {
    const c = [...new Set(allVehicles.map(v => v.color).filter(Boolean))].sort()
    return c
  }, [allVehicles])

  const yearRange = useMemo(() => {
    const years = allVehicles.map(v => v.year).filter(Boolean)
    return { min: Math.min(...years) || 2000, max: Math.max(...years) || new Date().getFullYear() }
  }, [allVehicles])

  // Count active filters (excluding sort and onlyFavs)
  const activeCount = useMemo(() => {
    return Object.entries(filters).filter(([k, v]) => k !== 'sort' && k !== 'onlyFavs' && v !== '').length
      + (filters.onlyFavs ? 1 : 0)
  }, [filters])

  // Apply filters + sort
  const vehicles = useMemo(() => {
    let result = [...allVehicles]

    // Clients only see available vehicles
    if (user?.role === 'cliente') result = result.filter(v => v.status === 'available')

    if (filters.onlyFavs) result = result.filter(v => isFav(v.id))

    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(v =>
        v.brand?.toLowerCase().includes(q) ||
        v.model?.toLowerCase().includes(q) ||
        v.description?.toLowerCase().includes(q)
      )
    }
    if (filters.status) result = result.filter(v => v.status === filters.status)
    if (filters.type)   result = result.filter(v => v.type === filters.type)
    if (filters.brand)  result = result.filter(v => v.brand === filters.brand)
    if (filters.color)  result = result.filter(v => v.color === filters.color)
    if (filters.yearFrom) result = result.filter(v => v.year >= parseInt(filters.yearFrom))
    if (filters.yearTo)   result = result.filter(v => v.year <= parseInt(filters.yearTo))
    if (filters.priceFrom) result = result.filter(v => {
      const p = parseFloat(v.price_min) || parseFloat(v.price_max)
      return p >= parseFloat(filters.priceFrom)
    })
    if (filters.priceTo) result = result.filter(v => {
      const p = parseFloat(v.price_max) || parseFloat(v.price_min)
      return p && p <= parseFloat(filters.priceTo)
    })
    if (filters.kmMax) result = result.filter(v => parseInt(v.km) <= parseInt(filters.kmMax))

    switch (filters.sort) {
      case 'oldest':    result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); break
      case 'price_asc': result.sort((a, b) => (parseFloat(a.price_min) || 0) - (parseFloat(b.price_min) || 0)); break
      case 'price_desc':result.sort((a, b) => (parseFloat(b.price_min) || 0) - (parseFloat(a.price_min) || 0)); break
      case 'year_desc': result.sort((a, b) => b.year - a.year); break
      case 'year_asc':  result.sort((a, b) => a.year - b.year); break
      case 'km_asc':    result.sort((a, b) => (parseInt(a.km) || 0) - (parseInt(b.km) || 0)); break
      case 'km_desc':   result.sort((a, b) => (parseInt(b.km) || 0) - (parseInt(a.km) || 0)); break
      default:          result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }

    return result
  }, [allVehicles, filters, isFav, user])

  const canAdd = user && (user.role === 'vendedor' || user.role === 'dueno')

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(vehicles.map(v => v.id)))
  const clearSelection = () => setSelected(new Set())

  const handleBulkStatus = async (status) => {
    if (selected.size === 0) return
    if (!confirm(`¿Cambiar ${selected.size} vehículo(s) a "${status === 'available' ? 'Disponible' : 'Retirado'}"?`)) return
    setBulkLoading(true)
    try {
      await bulkUpdateVehicleStatus([...selected], status)
      const res = await getVehicles()
      setAllVehicles(res.data || [])
      setSelected(new Set())
    } catch (err) { alert('Error: ' + err.message) }
    finally { setBulkLoading(false) }
  }

  const handleCSVImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImportLoading(true)
    setImportResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await importVehiclesCSV(fd)
      setImportResult(res.data)
      const refreshed = await getVehicles()
      setAllVehicles(refreshed.data || [])
    } catch (err) { setImportResult({ error: err.message }) }
    finally { setImportLoading(false); e.target.value = '' }
  }

  // For clients, total = only available vehicles
  const totalForUser = user?.role === 'cliente'
    ? allVehicles.filter(v => v.status === 'available').length
    : allVehicles.length

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Vehículos</h2>
          <p>
            {vehicles.length} de {totalForUser} vehículo{totalForUser !== 1 ? 's' : ''}
            {activeCount > 0 && <span style={{ color: 'var(--accent)', marginLeft: 6 }}>· {activeCount} filtro{activeCount !== 1 ? 's' : ''} activo{activeCount !== 1 ? 's' : ''}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {vehicles.length > 0 && (
            <button onClick={() => exportCSV(vehicles)} className="btn btn-secondary btn-sm">
              Exportar CSV
            </button>
          )}
          {canAdd && (
            <>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleCSVImport}
              />
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => csvInputRef.current?.click()}
                disabled={importLoading}
              >
                {importLoading ? 'Importando...' : '📥 Importar CSV'}
              </button>
              <Link to="/vehicles/new" className="btn btn-primary">+ Agregar Vehículo</Link>
            </>
          )}
        </div>
      </div>

      {/* CSV import result */}
      {importResult && (
        <div className={`alert ${importResult.error ? 'alert-danger' : 'alert-success'}`} style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {importResult.error
            ? `Error: ${importResult.error}`
            : `✅ ${importResult.inserted} vehículo(s) importados${importResult.errors?.length ? ` · ${importResult.errors.length} error(es)` : ''}`
          }
          <button onClick={() => setImportResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 16 }}>✕</button>
        </div>
      )}

      {/* Bulk actions toolbar */}
      {canAdd && selected.size > 0 && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'var(--accent)', borderRadius: 10,
          padding: '10px 20px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          boxShadow: '0 4px 20px rgba(74,232,208,0.3)',
        }}>
          <span style={{ fontWeight: 700, color: '#000', fontSize: 14 }}>
            {selected.size} seleccionado{selected.size !== 1 ? 's' : ''}
          </span>
          <button
            className="btn btn-sm"
            style={{ background: 'rgba(0,0,0,0.2)', color: '#000', border: 'none' }}
            onClick={() => handleBulkStatus('available')}
            disabled={bulkLoading}
          >Marcar Disponibles</button>
          <button
            className="btn btn-sm"
            style={{ background: 'rgba(0,0,0,0.2)', color: '#000', border: 'none' }}
            onClick={() => handleBulkStatus('withdrawn')}
            disabled={bulkLoading}
          >Retirar del Stock</button>
          <button
            className="btn btn-sm"
            style={{ background: 'transparent', color: '#000', border: '1px solid rgba(0,0,0,0.3)', marginLeft: 'auto' }}
            onClick={clearSelection}
          >✕ Cancelar</button>
        </div>
      )}

      {/* Select all row — only for managers */}
      {canAdd && vehicles.length > 0 && !loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, fontSize: 13 }}>
          <button
            onClick={selected.size === vehicles.length ? clearSelection : selectAll}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: 11 }}
          >
            {selected.size === vehicles.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
          </button>
          {selected.size > 0 && (
            <span style={{ color: 'var(--text-muted)' }}>{selected.size} de {vehicles.length} seleccionados</span>
          )}
        </div>
      )}

      {/* Filter panel */}
      <div className="card" style={{ marginBottom: 20, padding: '0' }}>
        {/* Panel header */}
        <button
          onClick={() => setFiltersOpen(o => !o)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text)', borderBottom: filtersOpen ? '1px solid var(--border)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            <span style={{ fontWeight: 600, fontSize: 13 }}>Filtros</span>
            {activeCount > 0 && (
              <span style={{
                background: 'var(--accent)', color: '#000', fontSize: 10, fontWeight: 800,
                borderRadius: 20, padding: '1px 7px', letterSpacing: 0.3,
              }}>{activeCount}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {activeCount > 0 && (
              <span
                onClick={e => { e.stopPropagation(); clearFilters() }}
                style={{ fontSize: 11, color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Limpiar todo
              </span>
            )}
            <ChevronIcon open={filtersOpen} />
          </div>
        </button>

        {filtersOpen && (
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Row 1: Search + Sort + Favs toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px auto', gap: 12, alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 11 }}>Buscar</label>
                <input
                  value={filters.search}
                  onChange={e => set('search', e.target.value)}
                  placeholder="Marca, modelo, descripción..."
                  style={{ height: 36 }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 11 }}>Ordenar por</label>
                <select value={filters.sort} onChange={e => set('sort', e.target.value)} style={{ height: 36 }}>
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <button
                onClick={() => set('onlyFavs', !filters.onlyFavs)}
                style={{
                  height: 36, padding: '0 14px', borderRadius: 8, cursor: 'pointer',
                  border: `1.5px solid ${filters.onlyFavs ? '#e8a040' : 'var(--border)'}`,
                  background: filters.onlyFavs ? 'rgba(232,160,64,0.12)' : 'transparent',
                  color: filters.onlyFavs ? 'var(--accent)' : 'var(--text-muted)',
                  fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.15s',
                }}
              >
                ⭐ Solo favoritos
              </button>
            </div>

            {/* Row 2: Status + Type + Brand + Color */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {user?.role !== 'cliente' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 11 }}>Estado</label>
                  <select value={filters.status} onChange={e => set('status', e.target.value)} style={{ height: 36 }}>
                    <option value="">Todos</option>
                    <option value="available">Disponible</option>
                    <option value="sold">Vendido</option>
                    <option value="withdrawn">Retirado</option>
                  </select>
                </div>
              )}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 11 }}>Tipo</label>
                <select value={filters.type} onChange={e => set('type', e.target.value)} style={{ height: 36 }}>
                  <option value="">Todos</option>
                  <option value="utility">Utilitario</option>
                  <option value="road">Ruta</option>
                  <option value="luxury">Lujo</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 11 }}>Marca</label>
                <select value={filters.brand} onChange={e => set('brand', e.target.value)} style={{ height: 36 }}>
                  <option value="">Todas</option>
                  {brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 11 }}>Color</label>
                <select value={filters.color} onChange={e => set('color', e.target.value)} style={{ height: 36 }}>
                  <option value="">Todos</option>
                  {colors.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Row 3: Year + Price + Km */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 11 }}>Año desde</label>
                <input
                  type="number" value={filters.yearFrom}
                  onChange={e => set('yearFrom', e.target.value)}
                  placeholder={String(yearRange.min)}
                  min={yearRange.min} max={yearRange.max}
                  style={{ height: 36 }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 11 }}>Año hasta</label>
                <input
                  type="number" value={filters.yearTo}
                  onChange={e => set('yearTo', e.target.value)}
                  placeholder={String(yearRange.max)}
                  min={yearRange.min} max={yearRange.max}
                  style={{ height: 36 }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 11 }}>Precio mínimo ($)</label>
                <input
                  type="number" value={filters.priceFrom}
                  onChange={e => set('priceFrom', e.target.value)}
                  placeholder="0"
                  style={{ height: 36 }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 11 }}>Precio máximo ($)</label>
                <input
                  type="number" value={filters.priceTo}
                  onChange={e => set('priceTo', e.target.value)}
                  placeholder="Sin límite"
                  style={{ height: 36 }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 11 }}>Km máximos</label>
                <input
                  type="number" value={filters.kmMax}
                  onChange={e => set('kmMax', e.target.value)}
                  placeholder="Sin límite"
                  style={{ height: 36 }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading">Cargando vehículos...</div>
      ) : vehicles.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🚗</div>
          <h3>Sin resultados</h3>
          <p>No se encontraron vehículos con los filtros actuales.</p>
          {activeCount > 0 && (
            <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={clearFilters}>
              Limpiar filtros
            </button>
          )}
          {canAdd && (
            <Link to="/vehicles/new" className="btn btn-primary" style={{ marginTop: 12 }}>
              Agregar vehículo
            </Link>
          )}
        </div>
      ) : (
        <div className="vehicles-grid">
          {vehicles.map(v => (
            <div key={v.id} style={{ position: 'relative', outline: selected.has(v.id) ? '2px solid var(--accent)' : 'none', borderRadius: 12 }}>
              {/* Checkbox for bulk actions — managers only */}
              {canAdd && (
                <input
                  type="checkbox"
                  checked={selected.has(v.id)}
                  onChange={() => toggleSelect(v.id)}
                  onClick={e => e.stopPropagation()}
                  style={{
                    position: 'absolute', top: 8, left: 8, zIndex: 10,
                    width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--accent)',
                  }}
                />
              )}
              {/* Favorite button */}
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); toggleFav(v.id) }}
                style={{
                  position: 'absolute', top: 8, right: 8, zIndex: 10,
                  width: 30, height: 30, borderRadius: '50%',
                  border: 'none', cursor: 'pointer',
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15,
                  transition: 'transform 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                title={isFav(v.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              >
                {isFav(v.id) ? '❤️' : '🤍'}
              </button>

              <Link to={`/vehicles/${v.id}`} className="vehicle-card">
                {v.photos && v.photos[0] ? (
                  <img
                    className="vehicle-card-img"
                    src={getPhotoSrc(v.photos[0])}
                    alt={`${v.brand} ${v.model}`}
                  />
                ) : (
                  <div className="vehicle-card-img-placeholder">🚗</div>
                )}
                <div className="vehicle-card-body">
                  <div className="vehicle-card-header">
                    <div className="vehicle-card-title">{v.brand} {v.model}</div>
                    <StatusBadge status={v.status} />
                  </div>
                  <div className="vehicle-card-sub">
                    <span className={`tag ${typeClass[v.type]}`}>{typeLabels[v.type]}</span>
                    {v.color && <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--text-muted)' }}>{v.color}</span>}
                  </div>
                  <div className="vehicle-card-meta">
                    <span>📅 {v.year}</span>
                    <span>🛣️ {formatKm(v.km)}</span>
                  </div>
                  <div className="vehicle-card-price">
                    {formatPrice(v.price_min, v.price_max)}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
