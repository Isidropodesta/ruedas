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

function Sparkline({ color = '#4ae8d0', height = 24, width = 60 }) {
  const points = [0, 8, 3, 15, 6, 5, 10, 18, 14, 10, 18, 14, 22, 8, 26, 12, 30, 6, 34, 16, 38, 10, 42, 14, 46, 8, 50, 12, 54, 6, 58, 10]
  const pts = []
  for (let i = 0; i < points.length; i += 2) {
    pts.push(`${points[i]},${height - points[i + 1] * height / 20}`)
  }
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  )
}

// Decorative 3D wireframe mesh SVG overlay
function WireframeMesh() {
  const lines = []
  const W = 500
  const H = 180
  const cols = 9
  const rows = 6
  const vanishX = W / 2
  const vanishY = H * 0.15
  const baseY = H
  const spread = W * 0.52

  // Vertical fan lines (left to right)
  for (let i = 0; i <= cols; i++) {
    const t = i / cols
    const bx = vanishX - spread + t * spread * 2
    lines.push(
      <line
        key={`vl${i}`}
        x1={vanishX} y1={vanishY}
        x2={bx} y2={baseY}
        stroke="rgba(100,200,220,0.25)"
        strokeWidth="0.8"
      />
    )
  }

  // Horizontal "depth" lines
  for (let j = 1; j <= rows; j++) {
    const t = j / rows
    // ease: closer to base = wider apart
    const yt = vanishY + t * (baseY - vanishY)
    const halfW = (t * spread * 2)
    const x1 = vanishX - halfW
    const x2 = vanishX + halfW
    lines.push(
      <line
        key={`hl${j}`}
        x1={x1} y1={yt}
        x2={x2} y2={yt}
        stroke="rgba(100,200,220,0.2)"
        strokeWidth="0.7"
      />
    )
  }

  return (
    <svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ position: 'absolute', bottom: 0, left: 0, pointerEvents: 'none', opacity: 0.6 }}
    >
      {lines}
    </svg>
  )
}

// Floating particles for chart decoration
function ChartParticles() {
  const particles = [
    { left: '12%', top: '22%', size: 4, opacity: 0.5 },
    { left: '28%', top: '48%', size: 3, opacity: 0.35 },
    { left: '55%', top: '18%', size: 5, opacity: 0.45 },
    { left: '70%', top: '60%', size: 3, opacity: 0.3 },
    { left: '85%', top: '30%', size: 4, opacity: 0.4 },
    { left: '42%', top: '70%', size: 3, opacity: 0.25 },
  ]
  return (
    <>
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: '#4ae8d0',
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 2}px rgba(74,232,208,0.6)`,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  )
}

// Custom glowing dot for recharts
function GlowDot(props) {
  const { cx, cy } = props
  if (!cx || !cy) return null
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill="rgba(74,232,208,0.15)" />
      <circle cx={cx} cy={cy} r={3} fill="#4ae8d0" />
      <circle cx={cx} cy={cy} r={1.5} fill="#fff" />
    </g>
  )
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
      <div className="chart-wrapper" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ marginBottom: 20 }}>
          <div className="chart-title">Ventas Mensuales (últimos 12 meses)</div>
        </div>
        <ChartParticles />
        {monthly.length === 0 ? (
          <div style={{ position: 'relative', height: 280 }}>
            <WireframeMesh />
            <div className="empty-state" style={{ padding: '60px 0', position: 'relative', zIndex: 1 }}>
              <p>No hay datos de ventas aún.</p>
            </div>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ae8d0" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#4ae8d0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="0"
                  stroke="rgba(255,255,255,0.03)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month_label"
                  stroke="transparent"
                  tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="transparent"
                  tick={{ fill: 'rgba(255,255,255,0.15)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1a1510',
                    border: '1px solid rgba(74,232,208,0.2)',
                    borderRadius: 8,
                    color: '#f0eeeb',
                    fontSize: 13,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                  }}
                  labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}
                  formatter={(value, name) => {
                    if (name === 'count') return [value, 'Vehículos']
                    return [value, name]
                  }}
                  cursor={{ stroke: 'rgba(74,232,208,0.15)', strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#4ae8d0"
                  strokeWidth={2}
                  fill="url(#colorSales)"
                  dot={<GlowDot />}
                  activeDot={{ r: 6, fill: '#4ae8d0', stroke: '#0d0d12', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
            <WireframeMesh />
          </div>
        )}
      </div>

      {/* ── Top Sellers Table ──────────────────────────────── */}
      <div className="card">
        <div className="card-header" style={{ paddingBottom: 16 }}>
          <span className="card-title">Top Vendedores por Facturación</span>
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
                    <th>VENDEDOR</th>
                    <th>ESTADO</th>
                    <th>VENDIDOS</th>
                    <th>ESTE MES</th>
                    <th>ESTE AÑO</th>
                    <th>FACTURACIÓN TOTAL</th>
                    <th>TICKET PROMEDIO</th>
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
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                background: bgColor,
                                color: textColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 11,
                                fontWeight: 800,
                                flexShrink: 0,
                                border: `1.5px solid ${textColor}33`,
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
                        <td style={{ color: 'var(--text)', fontWeight: 600 }}>
                          {s.vehicles_sold}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: 13, minWidth: 16 }}>
                              {s.vehicles_sold_this_month}
                            </span>
                            <Sparkline color="#4ae8d0" width={60} height={24} />
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: 13, minWidth: 16 }}>
                              {s.vehicles_sold_this_year}
                            </span>
                            <Sparkline color="#a87ff5" width={60} height={24} />
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>
                            {formatCurrency(s.total_revenue)}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.75)', fontSize: 13.5 }}>
                            {formatCurrency(s.avg_ticket)}
                          </span>
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
