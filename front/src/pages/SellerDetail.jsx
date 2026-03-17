import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getSeller, toggleSeller } from '../api'
import KpiCard from '../components/KpiCard'

function formatCurrency(n) {
  const num = parseFloat(n) || 0
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`
  return `$${num.toFixed(0)}`
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function getInitials(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

const typeLabels = { utility: 'Utilitario', road: 'Ruta', luxury: 'Lujo' }

export default function SellerDetail() {
  const { id } = useParams()
  const [seller, setSeller] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSeller(id)
      .then(res => setSeller(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const handleToggle = async () => {
    try {
      const res = await toggleSeller(id)
      setSeller(prev => ({ ...prev, active: res.data.active }))
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  if (loading) return <div className="loading">Cargando vendedor...</div>
  if (!seller) return <div className="alert alert-danger">Vendedor no encontrado.</div>

  const stats = seller.stats || {}
  const vehicles = seller.vehicles || []

  return (
    <div>
      <Link to="/sellers" className="back-link">← Volver a Vendedores</Link>

      {/* Header */}
      <div className="form-section" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {seller.photo_url ? (
            <img src={seller.photo_url} alt={seller.name} style={{ width: 72, height: 72, borderRadius: 16, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.12)' }} />
          ) : (
            <div className="seller-avatar" style={{ width: 72, height: 72, fontSize: 28, borderRadius: 16 }}>
              {getInitials(seller.name)}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 24, fontWeight: 800 }}>{seller.name}</h2>
              <span className={`status-badge ${seller.active ? 'available' : 'withdrawn'}`}>
                <span className="status-dot" />
                {seller.active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 8, flexWrap: 'wrap' }}>
              {seller.email && (
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  📧 {seller.email}
                </span>
              )}
              {seller.phone && (
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  📞 {seller.phone}
                </span>
              )}
              {seller.hire_date && (
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  📅 Ingreso: {formatDate(seller.hire_date)}
                </span>
              )}
            </div>
          </div>
          <button
            className={`btn ${seller.active ? 'btn-secondary' : 'btn-success'}`}
            onClick={handleToggle}
          >
            {seller.active ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <KpiCard
          icon="🏷️"
          iconColor="red"
          title="Vendidos Total"
          value={stats.vehicles_sold || 0}
        />
        <KpiCard
          icon="📅"
          iconColor="blue"
          title="Este Mes"
          value={stats.vehicles_sold_this_month || 0}
        />
        <KpiCard
          icon="📆"
          iconColor="purple"
          title="Este Año"
          value={stats.vehicles_sold_this_year || 0}
        />
        <KpiCard
          icon="💰"
          iconColor="yellow"
          title="Facturación Total"
          value={formatCurrency(stats.total_revenue)}
        />
        <KpiCard
          icon="📊"
          iconColor="green"
          title="Ticket Promedio"
          value={formatCurrency(stats.avg_ticket)}
        />
      </div>

      {/* Vehicles table */}
      <div className="card">
        <div className="card-header" style={{ paddingBottom: 16 }}>
          <span className="card-title">Vehículos Vendidos</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{vehicles.length} ventas</span>
        </div>
        <div style={{ padding: 0 }}>
          {vehicles.length === 0 ? (
            <div className="empty-state">
              <p>Este vendedor no ha registrado ventas aún.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Vehículo</th>
                    <th>Tipo</th>
                    <th>Año</th>
                    <th>Precio de Venta</th>
                    <th>Fecha de Venta</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map(v => (
                    <tr key={v.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {v.photo ? (
                            <img
                              src={v.photo}
                              alt=""
                              style={{ width: 44, height: 36, objectFit: 'cover', borderRadius: 4 }}
                            />
                          ) : (
                            <div style={{
                              width: 44, height: 36, borderRadius: 4, background: '#f3f4f6',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
                            }}>
                              🚗
                            </div>
                          )}
                          <Link
                            to={`/vehicles/${v.id}`}
                            style={{ fontWeight: 700, color: 'var(--text)', textDecoration: 'none' }}
                          >
                            {v.brand} {v.model}
                          </Link>
                        </div>
                      </td>
                      <td>
                        <span className={`tag tag-${v.type}`}>{typeLabels[v.type]}</span>
                      </td>
                      <td>{v.year}</td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                        {v.sale_price
                          ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v.sale_price)
                          : '-'}
                      </td>
                      <td>{formatDate(v.sold_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
