import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getVehicles } from '../api'
import { useFavorites } from '../context/FavoritesContext'
import StatusBadge from '../components/StatusBadge'

const BASE_URL = import.meta.env.VITE_API_URL || ''

function getPhotoSrc(url) {
  if (!url) return ''
  if (typeof url === 'string' && !url.startsWith('http') && BASE_URL) return BASE_URL + url
  return url
}

const typeLabels = { utility: 'Utilitario', road: 'Ruta', luxury: 'Lujo' }
const typeClass  = { utility: 'tag-utility', road: 'tag-road', luxury: 'tag-luxury' }

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

export default function Favorites() {
  const { favs, toggle: toggleFav, isFav } = useFavorites()
  const [allVehicles, setAllVehicles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getVehicles()
      .then(res => setAllVehicles(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const favoriteVehicles = allVehicles.filter(v => isFav(v.id))

  const clearAll = () => {
    favs.forEach(id => toggleFav(id))
  }

  if (loading) return <div className="loading">Cargando favoritos...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Favoritos</h2>
          <p>{favoriteVehicles.length} vehículo{favoriteVehicles.length !== 1 ? 's' : ''} guardado{favoriteVehicles.length !== 1 ? 's' : ''}</p>
        </div>
        {favoriteVehicles.length > 0 && (
          <button
            onClick={clearAll}
            className="btn btn-secondary"
          >
            Limpiar todos
          </button>
        )}
      </div>

      {favoriteVehicles.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">❤️</div>
          <h3>Sin favoritos aún</h3>
          <p>Marcá vehículos como favoritos desde el catálogo para verlos aquí.</p>
          <Link to="/vehicles" className="btn btn-primary" style={{ marginTop: 16 }}>
            Ver catálogo
          </Link>
        </div>
      ) : (
        <div className="vehicles-grid">
          {favoriteVehicles.map(v => (
            <div key={v.id} style={{ position: 'relative' }}>
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
                title="Quitar de favoritos"
              >
                ❤️
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
