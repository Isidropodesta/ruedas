import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { getGeneralKpis, getMonthlyKpis, getSellerKpis } from '../api'
import KpiCard from '../components/KpiCard'

function formatCurrency(n) {
  const num = parseFloat(n) || 0
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`
  return `$${num.toFixed(0)}`
}

export default function Dashboard() {
  const [general, setGeneral] = useState(null)
  const [monthly, setMonthly] = useState([])
  const [sellers, setSellers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getGeneralKpis(), getMonthlyKpis(), getSellerKpis()])
      .then(([g, m, s]) => {
        setGeneral(g.data)
        setMonthly(m.data)
        setSellers(s.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">Cargando dashboard...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Resumen general de la concesionaria</p>
        </div>
        <Link to="/vehicles/new" className="btn btn-primary">
          + Agregar Vehículo
        </Link>
      </div>

      <div className="kpi-grid">
        <KpiCard
          icon="🚗"
          iconColor="blue"
          title="Total Vehículos"
          value={general?.total_vehicles || 0}
          subtitle="En el sistema"
        />
        <KpiCard
          icon="✅"
          iconColor="green"
          title="Disponibles"
          value={general?.available || 0}
          subtitle="En stock"
        />
        <KpiCard
          icon="🏷️"
          iconColor="red"
          title="Vendidos"
          value={general?.sold || 0}
          subtitle="Total histórico"
        />
        <KpiCard
          icon="📦"
          iconColor="gray"
          title="Retirados"
          value={general?.withdrawn || 0}
          subtitle="Fuera de stock"
        />
        <KpiCard
          icon="💰"
          iconColor="yellow"
          title="Facturación Total"
          value={formatCurrency(general?.total_revenue || 0)}
          subtitle="Sobre ventas realizadas"
        />
      </div>

      <div className="chart-wrapper">
        <div className="chart-title">Ventas Mensuales (últimos 12 meses)</div>
        {monthly.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 0' }}>
            <p>No hay datos de ventas aún.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthly} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month_label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'count') return [value, 'Vehículos']
                  return [value, name]
                }}
              />
              <Bar dataKey="count" fill="#e94560" radius={[4, 4, 0, 0]} name="count" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Top Vendedores por Facturación</span>
          <Link to="/sellers" className="btn btn-secondary btn-sm">Ver todos</Link>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {sellers.length === 0 ? (
            <div className="empty-state">
              <p>No hay vendedores registrados.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Vendedor</th>
                    <th>Estado</th>
                    <th>Vendidos</th>
                    <th>Este Mes</th>
                    <th>Este Año</th>
                    <th>Facturación Total</th>
                    <th>Ticket Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {sellers.slice(0, 8).map(s => (
                    <tr key={s.id}>
                      <td>
                        <Link to={`/sellers/${s.id}`} style={{ fontWeight: 600, color: 'var(--text)', textDecoration: 'none' }}>
                          {s.name}
                        </Link>
                      </td>
                      <td>
                        <span className={`status-badge ${s.active ? 'available' : 'withdrawn'}`}>
                          <span className="status-dot" />
                          {s.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>{s.vehicles_sold}</td>
                      <td>{s.vehicles_sold_this_month}</td>
                      <td>{s.vehicles_sold_this_year}</td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                        {formatCurrency(s.total_revenue)}
                      </td>
                      <td>{formatCurrency(s.avg_ticket)}</td>
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
