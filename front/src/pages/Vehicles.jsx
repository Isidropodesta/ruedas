import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getVehicles } from '../api'
import StatusBadge from '../components/StatusBadge'

const typeLabels = { utility: 'Utilitario', road: 'Ruta', luxury: 'Lujo' }
const typeClass = { utility: 'tag-utility', road: 'tag-road', luxury: 'tag-luxury' }

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
  const fMin = fmt(min)
  const fMax = fmt(max)
  if (fMin && fMax) return `${fMin} – ${fMax}`
  if (fMin) return `desde ${fMin}`
  if (fMax) return `hasta ${fMax}`
  return 'Sin precio'
}

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ search: '', status: '', type: '' })

  const fetchVehicles = async (f) => {
    setLoading(true)
    try {
      const res = await getVehicles(f)
      setVehicles(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVehicles(filters)
  }, [])

  const handleFilterChange = (key, value) => {
    const next = { ...filters, [key]: value }
    setFilters(next)
    fetchVehicles(next)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Vehículos</h2>
          <p>{vehicles.length} vehículo{vehicles.length !== 1 ? 's' : ''} encontrado{vehicles.length !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/vehicles/new" className="btn btn-primary">
          + Agregar Vehículo
        </Link>
      </div>

      <div className="filters-bar">
        <input
          className="search-input"
          placeholder="Buscar por marca o modelo..."
          value={filters.search}
          onChange={e => handleFilterChange('search', e.target.value)}
        />
        <select
          value={filters.status}
          onChange={e => handleFilterChange('status', e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="available">Disponible</option>
          <option value="sold">Vendido</option>
          <option value="withdrawn">Retirado</option>
        </select>
        <select
          value={filters.type}
          onChange={e => handleFilterChange('type', e.target.value)}
        >
          <option value="">Todos los tipos</option>
          <option value="utility">Utilitario</option>
          <option value="road">Ruta</option>
          <option value="luxury">Lujo</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">Cargando vehículos...</div>
      ) : vehicles.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🚗</div>
          <h3>Sin vehículos</h3>
          <p>No se encontraron vehículos con los filtros actuales.</p>
          <Link to="/vehicles/new" className="btn btn-primary" style={{ marginTop: 16 }}>
            Agregar el primero
          </Link>
        </div>
      ) : (
        <div className="vehicles-grid">
          {vehicles.map(v => (
            <Link key={v.id} to={`/vehicles/${v.id}`} className="vehicle-card">
              {v.photos && v.photos[0] ? (
                <img
                  className="vehicle-card-img"
                  src={v.photos[0]}
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
          ))}
        </div>
      )}
    </div>
  )
}
