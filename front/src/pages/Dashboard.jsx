import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { getGeneralKpis, getMonthlyKpis, getSellerKpis, getVehicles } from '../api'
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

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const now = new Date()
  const then = new Date(dateStr)
  const diffMs = now - then
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays >= 1) return `hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`
  if (diffHours >= 1) return `hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`
  return 'hace un momento'
}

const AVATAR_COLORS = [
  ['#1e2d4a', '#4a90e8'],
  ['#1a2e22', '#3de88a'],
  ['#2e1e2a', '#e87ab0'],
  ['#2a2218', '#e8a040'],
  ['#22201e', '#e85040'],
  ['#1e1e2e', '#a87ff5'],
]

const RANK_MEDALS = ['🥇', '🥈', '🥉']

// ── Animated background cyber grid ─────────────────────────
function CyberGrid() {
  return (
    <div className="cyber-grid" aria-hidden="true">
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={`h${i}`} className="cyber-grid-line-h" style={{ top: `${i * 5}%` }} />
      ))}
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={`v${i}`} className="cyber-grid-line-v" style={{ left: `${i * 5}%` }} />
      ))}
    </div>
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

  for (let j = 1; j <= rows; j++) {
    const t = j / rows
    const yt = vanishY + t * (baseY - vanishY)
    const halfW = t * spread * 2
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

// Custom dark glassmorphism tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="chart-tooltip-row">
          <span className="chart-tooltip-dot" style={{ background: p.color }} />
          <span>{p.name === 'count' ? 'Ventas' : 'Facturación'}: </span>
          <strong>{p.name === 'revenue' ? `$${Number(p.value).toLocaleString()}` : p.value}</strong>
        </div>
      ))}
    </div>
  )
}

// Sparkline for seller table
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

// Donut chart using recharts PieChart
const DONUT_COLORS = {
  utility: '#e8c840',
  road: '#a87ff5',
  luxury: '#e870aa',
}
const DONUT_LABELS = {
  utility: 'Utilitario',
  road: 'Ruta',
  luxury: 'Lujo',
}

function VehicleDonut({ vehicles }) {
  const counts = {}
  vehicles.forEach(v => {
    const t = v.type || 'other'
    counts[t] = (counts[t] || 0) + 1
  })

  const total = vehicles.length || 1
  const data = Object.entries(counts).map(([key, value]) => ({
    name: DONUT_LABELS[key] || key,
    value,
    color: DONUT_COLORS[key] || '#4ae8d0',
    key,
  }))

  if (data.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '40px 0' }}>
        <p>Sin datos de vehículos.</p>
      </div>
    )
  }

  return (
    <div className="donut-section">
      <PieChart width={160} height={160}>
        <Pie
          data={data}
          cx={75}
          cy={75}
          innerRadius={48}
          outerRadius={72}
          paddingAngle={3}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
      </PieChart>
      <div className="donut-legend">
        {data.map((entry, i) => (
          <div key={i} className="donut-legend-item">
            <span className="donut-legend-dot" style={{ background: entry.color }} />
            <span className="donut-legend-label">{entry.name}</span>
            <span className="donut-legend-value">{entry.value}</span>
            <span className="donut-legend-pct">{Math.round((entry.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [general, setGeneral] = useState(null)
  const [monthly, setMonthly] = useState([])
  const [sellers, setSellers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getGeneralKpis(), getMonthlyKpis(), getSellerKpis(), getVehicles()])
      .then(([g, m, s, v]) => {
        setGeneral(g.data)
        setMonthly(m.data)
        setSellers(s.data)
        setVehicles(Array.isArray(v.data) ? v.data : [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">Cargando dashboard...</div>

  // Last 5 vehicles sorted by created_at desc
  const recentVehicles = [...vehicles]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5)

  const getStatusClass = (status) => {
    if (status === 'available') return 'available'
    if (status === 'sold') return 'sold'
    return 'withdrawn'
  }

  const getStatusLabel = (status) => {
    if (status === 'available') return 'Disponible'
    if (status === 'sold') return 'Vendido'
    return 'Retirado'
  }

  return (
    <div className="page-content" style={{ padding: 0 }}>
      <CyberGrid />

      <div style={{ padding: '32px' }}>
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
            trend={5}
          />
          <KpiCard
            icon="✅"
            label="DISPONIBLES"
            value={general?.available ?? 0}
            sub="En stock"
            color="green"
            trend={2}
          />
          <KpiCard
            icon="🏷️"
            label="VENDIDOS"
            value={general?.sold ?? 0}
            sub="Total histórico"
            color="red"
            trend={-3}
          />
          <KpiCard
            icon="📦"
            label="RETIRADOS"
            value={general?.withdrawn ?? 0}
            sub="Fuera de stock"
            color="gray"
            trend={0}
          />
          <KpiCard
            icon="💰"
            label="FACTURACIÓN TOTAL"
            value={general?.total_revenue ?? 0}
            sub="Sobre ventas realizadas"
            color="gold"
            trend={8}
            isCurrency
          />
        </div>

        {/* ── Monthly Sales Chart ────────────────────────────── */}
        <div className="chart-wrapper" style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <div className="chart-title">Ventas Mensuales (últimos 12 meses)</div>
            <div className="chart-subtitle">Unidades vendidas y facturación mensual</div>
          </div>
          <ChartParticles />
          {/* Scanning line */}
          <div className="scan-line" />
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
                <AreaChart data={monthly} margin={{ top: 10, right: 50, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4ae8d0" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#4ae8d0" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a87ff5" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#a87ff5" stopOpacity={0} />
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
                    yAxisId="left"
                    allowDecimals={false}
                    stroke="transparent"
                    tick={{ fill: 'rgba(255,255,255,0.15)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    allowDecimals={false}
                    stroke="transparent"
                    tick={{ fill: 'rgba(168,127,245,0.4)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(74,232,208,0.15)', strokeWidth: 1 }} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="count"
                    stroke="#4ae8d0"
                    strokeWidth={2}
                    fill="url(#colorSales)"
                    dot={<GlowDot />}
                    activeDot={{ r: 6, fill: '#4ae8d0', stroke: '#0d0d12', strokeWidth: 2 }}
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#a87ff5"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    fill="url(#colorRevenue)"
                    dot={false}
                    activeDot={{ r: 5, fill: '#a87ff5', stroke: '#0d0d12', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <WireframeMesh />
            </div>
          )}
        </div>

        {/* ── Bottom grid: Donut chart ───────────────────────── */}
        <div className="dashboard-bottom-grid" style={{ marginBottom: 24 }}>
          {/* Distribución por tipo */}
          <div className="chart-wrapper" style={{ marginBottom: 0 }}>
            <div style={{ marginBottom: 20 }}>
              <div className="chart-title">Distribución por Tipo</div>
              <div className="chart-subtitle">Vehículos según categoría</div>
            </div>
            <VehicleDonut vehicles={vehicles} />
          </div>

          {/* Status breakdown */}
          <div className="chart-wrapper" style={{ marginBottom: 0 }}>
            <div style={{ marginBottom: 20 }}>
              <div className="chart-title">Estado del Inventario</div>
              <div className="chart-subtitle">Distribución por estado actual</div>
            </div>
            <div className="donut-section">
              <PieChart width={160} height={160}>
                <Pie
                  data={[
                    { name: 'Disponibles', value: general?.available ?? 0, color: '#3de88a' },
                    { name: 'Vendidos', value: general?.sold ?? 0, color: '#4a90e8' },
                    { name: 'Retirados', value: general?.withdrawn ?? 0, color: '#5a5860' },
                  ].filter(d => d.value > 0)}
                  cx={75}
                  cy={75}
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {[
                    { name: 'Disponibles', value: general?.available ?? 0, color: '#3de88a' },
                    { name: 'Vendidos', value: general?.sold ?? 0, color: '#4a90e8' },
                    { name: 'Retirados', value: general?.withdrawn ?? 0, color: '#5a5860' },
                  ].filter(d => d.value > 0).map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
              <div className="donut-legend">
                {[
                  { name: 'Disponibles', value: general?.available ?? 0, color: '#3de88a' },
                  { name: 'Vendidos', value: general?.sold ?? 0, color: '#4a90e8' },
                  { name: 'Retirados', value: general?.withdrawn ?? 0, color: '#5a5860' },
                ].map((entry, i) => {
                  const total = (general?.total_vehicles ?? 1) || 1
                  return (
                    <div key={i} className="donut-legend-item">
                      <span className="donut-legend-dot" style={{ background: entry.color }} />
                      <span className="donut-legend-label">{entry.name}</span>
                      <span className="donut-legend-value">{entry.value}</span>
                      <span className="donut-legend-pct">{Math.round((entry.value / total) * 100)}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Top Sellers Table ──────────────────────────────── */}
        <div className="card" style={{ marginBottom: 24 }}>
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
                      <th style={{ width: 40 }}>#</th>
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
                        <tr
                          key={s.id}
                          onClick={() => navigate(`/sellers/${s.id}`)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td className="rank-cell">
                            {i < 3 ? RANK_MEDALS[i] : <span style={{ color: 'var(--text-soft)', fontSize: 13 }}>{i + 1}</span>}
                          </td>
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
                              <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13.5 }}>
                                {s.name}
                              </span>
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

        {/* ── Actividad Reciente ─────────────────────────────── */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: 16 }}>
            <span className="card-title">Actividad Reciente</span>
            <Link to="/vehicles" className="btn btn-secondary btn-sm">Ver todos</Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {recentVehicles.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🚗</span>
                <p>No hay vehículos registrados aún.</p>
              </div>
            ) : (
              recentVehicles.map((v) => (
                <Link
                  key={v.id}
                  to={`/vehicles/${v.id}`}
                  className="activity-row"
                >
                  <div className="activity-info">
                    <div className="activity-name">
                      {v.brand} {v.model} {v.year ? `(${v.year})` : ''}
                    </div>
                    <div className="activity-meta">
                      <span className={`tag tag-${v.type}`}>{DONUT_LABELS[v.type] || v.type || '—'}</span>
                      &nbsp;&nbsp;
                      <span className={`status-badge ${getStatusClass(v.status)}`} style={{ fontSize: 10, padding: '1px 7px' }}>
                        <span className="status-dot" />
                        {getStatusLabel(v.status)}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {v.price && (
                      <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 14, marginBottom: 2 }}>
                        {formatCurrency(v.price)}
                      </div>
                    )}
                    <div className="activity-time">{timeAgo(v.created_at)}</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
