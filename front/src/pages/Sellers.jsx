import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getSellers, toggleSeller } from '../api'

function formatCurrency(n) {
  const num = parseFloat(n) || 0
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`
  return `$${num.toFixed(0)}`
}

function getInitials(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

export default function Sellers() {
  const [sellers, setSellers] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getSellers()
      .then(res => setSellers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleToggle = async (e, id) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const res = await toggleSeller(id)
      setSellers(prev => prev.map(s => s.id === id ? { ...s, active: res.data.active } : s))
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Vendedores</h2>
          <p>{sellers.length} vendedor{sellers.length !== 1 ? 'es' : ''} registrado{sellers.length !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/sellers/new" className="btn btn-primary">
          + Agregar Vendedor
        </Link>
      </div>

      {loading ? (
        <div className="loading">Cargando vendedores...</div>
      ) : sellers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👤</div>
          <h3>Sin vendedores</h3>
          <p>Todavía no hay vendedores registrados.</p>
          <Link to="/sellers/new" className="btn btn-primary" style={{ marginTop: 16 }}>
            Agregar el primero
          </Link>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th>Contacto</th>
                  <th>Vehículos Vendidos</th>
                  <th>Facturación Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sellers.map(s => (
                  <tr
                    key={s.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/sellers/${s.id}`)}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {s.photo_url ? (
                          <img src={s.photo_url} alt={s.name} style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
                        ) : (
                          <div className="seller-avatar" style={{ width: 38, height: 38, fontSize: 14 }}>
                            {getInitials(s.name)}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 700 }}>{s.name}</div>
                          {s.hire_date && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              Desde {new Date(s.hire_date).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>
                        {s.email && <div>{s.email}</div>}
                        {s.phone && <div style={{ color: 'var(--text-muted)' }}>{s.phone}</div>}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>{s.vehicles_sold}</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                      {formatCurrency(s.total_revenue)}
                    </td>
                    <td>
                      <span className={`status-badge ${s.active ? 'available' : 'withdrawn'}`}>
                        <span className="status-dot" />
                        {s.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm ${s.active ? 'btn-secondary' : 'btn-success'}`}
                        onClick={(e) => handleToggle(e, s.id)}
                      >
                        {s.active ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
