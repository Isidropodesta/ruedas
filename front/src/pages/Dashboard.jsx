import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { getGeneralKpis, getMonthlyKpis, getSellerKpis } from '../api'
import KpiCard from '../components/KpiCard'

function formatCurrency(n) {
  const num = parseFloat(n) || 0
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`
  return `$${num.toFixed(0)}`
}

function getInitials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

const AVATAR_COLORS = [
  ['#1e2d4a', '#4a90e8'],
  ['#1a2e22', '#3de88a'],
  ['#2e1e2a', '#e87ab0'],
  ['#2a2218', '#e8a040'],
  ['#22201e', '#e85040'],
  ['#1e1e2e', '#a87ff5'],
]

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
      {/* ── Page Header ───────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Resumen general de la concesionaria</p>
        </div>
        <Link to="/vehicles/new" className="btn btn-primary">
          + Agregar Vehículo
        </Link>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────── */}
      <div className="kpi-grid">
        <KpiCard
          icon="🚗"
          label="TOTAL VEHÍCULOS"
          value={general?.total_vehicles ?? 0}
          sub="En el sistema"
          color="blue"
        />
        <KpiCard
          icon="✅"
          label="DISPONIBLES"
          value={general?.available ?? 0}
          sub="En stock"
          color="green"
        />
        <KpiCard
          icon="🏷️"
          label="VENDIDOS"
          value={general?.sold ?? 0}
          sub="Total histórico"
          color="red"
        />
        <KpiCard
          icon="📦"
          label="RETIRADOS"
          value={general?.withdrawn ?? 0}
          sub="Fuera de stock"
          color="gray"
        />
        <KpiCard
          icon="💰"
          label="FACTURACIÓN TOTAL"
          value={formatCurrency(general?.total_revenue ?? 0)}
          sub="Sobre ventas realizadas"
          color="gold"
        />
      </div>

      {/* ── Monthly Sales Chart ────────────────────────────── */}
      <div className="chart-wrapper">
        <div className="chart-title">Ventas Mensuales</div>
        <div className="chart-subtitle">Últimos 12 meses</div>
        {monthly.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 0' }}>
            <p>No hay datos de ventas aún.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthly} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#4ae8c8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4ae8c8" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="month_label"
                stroke="#5a5860"
                tick={{ fill: '#5a5860', fontSize: 12 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                stroke="#5a5860"
                tick={{ fill: '#5a5860', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: '#1e1d26',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  color: '#f0eeeb',
                  fontSize: 13,
                }}
                labelStyle={{ color: '#8b8990', marginBottom: 4 }}
                formatter={(value, name) => {
                  if (name === 'count') return [value, 'Vehículos']
                  return [value, name]
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#4ae8c8"
                strokeWidth={2}
                fill="url(#colorSales)"
                dot={false}
                activeDot={{ r: 5, fill: '#4ae8c8', stroke: '#0d0d12', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Top Sellers Table ──────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Top Vendedores</span>
          <Link to="/sellers" className="btn btn-secondary btn-sm">Ver todos</Link>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {sellers.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">👤</span>
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
                  {sellers.slice(0, 8).map((s, i) => {
                    const [bgColor, textColor] = AVATAR_COLORS[i % AVATAR_COLORS.length]
                    return (
                      <tr key={s.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 8,
                                background: bgColor,
                                color: textColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12,
                                fontWeight: 800,
                                flexShrink: 0,
                                border: `1px solid ${textColor}22`,
                                letterSpacing: 0.5,
                              }}
                            >
                              {getInitials(s.name)}
                            </div>
                            <Link
                              to={`/sellers/${s.id}`}
                              style={{
                                fontWeight: 600,
                                color: 'var(--text)',
                                textDecoration: 'none',
                                fontSize: 13.5,
                              }}
                            >
                              {s.name}
                            </Link>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${s.active ? 'available' : 'withdrawn'}`}>
                            <span className="status-dot" />
                            {s.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{s.vehicles_sold}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{s.vehicles_sold_this_month}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{s.vehicles_sold_this_year}</td>
                        <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                          {formatCurrency(s.total_revenue)}
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>
                          {formatCurrency(s.avg_ticket)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
