import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from 'recharts'
import { getGeneralKpis, getMonthlyKpis, getSellerKpis, getVehicles, getAdvancedKpis } from '../api'
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

// SVG icons for KPI cards
const IconCar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 17H3a2 2 0 01-2-2v-4l2.5-6h13L19 11v4a2 2 0 01-2 2h-2"/>
    <circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/>
  </svg>
)
const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M8 12l3 3 5-5"/>
  </svg>
)
const IconTag = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
    <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none"/>
  </svg>
)
const IconBox = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
)
const IconDollar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 6v12M9 9.5c0-1.1.9-2 2-2h2a2 2 0 010 4h-2a2 2 0 000 4h2a2 2 0 002-2"/>
  </svg>
)
const IconClock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
)
const IconReceipt = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/>
    <line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/>
  </svg>
)
const IconCalPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/>
  </svg>
)

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

// Seller comparison bar chart
const SELLER_METRICS = [
  { key: 'total_revenue', label: 'Facturación', color: '#4ae8d0', format: formatCurrency },
  { key: 'vehicles_sold', label: 'Unidades', color: '#a87ff5', format: v => v },
  { key: 'avg_ticket', label: 'Ticket Prom.', color: '#e8c840', format: formatCurrency },
]

const SellerBarTooltip = ({ active, payload, label, metric }) => {
  if (!active || !payload?.length) return null
  const m = SELLER_METRICS.find(m => m.key === metric) || SELLER_METRICS[0]
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{label}</div>
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-dot" style={{ background: m.color }} />
        <span>{m.label}: </span>
        <strong>{m.format(payload[0].value)}</strong>
      </div>
    </div>
  )
}

function SellerComparisonChart({ sellers }) {
  const [metric, setMetric] = useState('total_revenue')
  const m = SELLER_METRICS.find(m => m.key === metric)

  const data = sellers
    .filter(s => parseFloat(s[metric]) > 0)
    .sort((a, b) => parseFloat(b[metric]) - parseFloat(a[metric]))
    .slice(0, 8)
    .map(s => ({
      name: s.name.split(' ')[0],
      fullName: s.name,
      value: parseFloat(s[metric]) || 0,
    }))

  if (data.length === 0) return (
    <div className="empty-state" style={{ padding: '40px 0' }}>
      <p>Sin datos comparativos.</p>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {SELLER_METRICS.map(met => (
          <button
            key={met.key}
            onClick={() => setMetric(met.key)}
            style={{
              padding: '5px 14px',
              borderRadius: 20,
              border: `1.5px solid ${metric === met.key ? met.color : 'rgba(255,255,255,0.1)'}`,
              background: metric === met.key ? `${met.color}18` : 'transparent',
              color: metric === met.key ? met.color : 'var(--text-soft)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {met.label}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: -10, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="transparent"
            tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            stroke="transparent"
            tick={{ fill: 'rgba(255,255,255,0.15)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={38}
            tickFormatter={v => metric === 'vehicles_sold' ? v : (v >= 1000 ? `${(v/1000).toFixed(0)}K` : v)}
          />
          <Tooltip content={<SellerBarTooltip metric={metric} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="value" fill={m.color} radius={[4, 4, 0, 0]} maxBarSize={48}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={i === 0 ? m.color : `${m.color}90`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* Mini table below chart */}
      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {data.map((d, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 8,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{i + 1}.</span>
            <span style={{ fontSize: 12, color: 'var(--text-soft)', fontWeight: 500 }}>{d.fullName.split(' ')[0]}</span>
            <span style={{ fontSize: 12, color: m.color, fontWeight: 700 }}>{m.format(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
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

const BASE_URL = import.meta.env.VITE_API_URL || ''
function getPhotoSrc(url) {
  if (!url) return null
  if (url.startsWith('http')) return url
  return BASE_URL + url
}

const PERIOD_OPTIONS = [
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1A' },
  { value: 'all', label: 'Todo' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [general, setGeneral] = useState(null)
  const [monthly, setMonthly] = useState([])
  const [sellers, setSellers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [advanced, setAdvanced] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('1y')
  const [periodLoading, setPeriodLoading] = useState(false)

  // Determine if this is a vendedor viewing only their own stats
  const isOwnView = user?.role === 'vendedor' && user?.seller_id

  useEffect(() => {
    const sellerFilter = isOwnView ? { seller_id: user.seller_id } : {}
    Promise.all([
      getGeneralKpis(),
      getMonthlyKpis(period),
      getSellerKpis({ period, ...sellerFilter }),
      getVehicles(),
      getAdvancedKpis(),
    ])
      .then(([g, m, s, v, adv]) => {
        setGeneral(g.data)
        setMonthly(m.data)
        setSellers(s.data)
        setVehicles(Array.isArray(v.data) ? v.data : [])
        setAdvanced(adv.data || null)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handlePeriodChange = useCallback(async (newPeriod) => {
    setPeriod(newPeriod)
    setPeriodLoading(true)
    const sellerFilter = isOwnView ? { seller_id: user.seller_id } : {}
    try {
      const [m, s] = await Promise.all([
        getMonthlyKpis(newPeriod),
        getSellerKpis({ period: newPeriod, ...sellerFilter }),
      ])
      setMonthly(m.data)
      setSellers(s.data)
    } catch (err) {
      console.error(err)
    } finally {
      setPeriodLoading(false)
    }
  }, [isOwnView, user])

  if (loading) return <div className="loading">Cargando dashboard...</div>

  // Last 5 vehicles sorted by created_at desc
  const recentVehicles = [...vehicles]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5)

  // Stock age alert: available vehicles older than 60 days
  const ALERT_DAYS = 60
  const now = new Date()
  const oldStock = vehicles
    .filter(v => v.status === 'available')
    .filter(v => {
      const days = Math.floor((now - new Date(v.created_at)) / (1000 * 60 * 60 * 24))
      return days >= ALERT_DAYS
    })
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

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
            icon={<IconCar />}
            label="TOTAL VEHÍCULOS"
            value={general?.total_vehicles ?? 0}
            sub="En el sistema"
            color="blue"
          />
          <KpiCard
            icon={<IconCheck />}
            label="DISPONIBLES"
            value={general?.available ?? 0}
            sub="En stock"
            color="green"
          />
          <KpiCard
            icon={<IconTag />}
            label="VENDIDOS"
            value={general?.sold ?? 0}
            sub="Total histórico"
            color="red"
          />
          <KpiCard
            icon={<IconBox />}
            label="RETIRADOS"
            value={general?.withdrawn ?? 0}
            sub="Fuera de stock"
            color="gray"
          />
          <KpiCard
            icon={<IconDollar />}
            label="FACTURACIÓN TOTAL"
            value={general?.total_revenue ?? 0}
            sub="Sobre ventas realizadas"
            color="gold"
            isCurrency
          />
          <KpiCard
            icon={<IconReceipt />}
            label="TICKET PROMEDIO"
            value={general?.avg_ticket ?? 0}
            sub="Por vehículo vendido"
            color="gold"
            isCurrency
          />
          <KpiCard
            icon={<IconCalPlus />}
            label="INGRESADOS ESTE MES"
            value={general?.vehicles_added_this_month ?? 0}
            sub="Vehículos cargados en el mes"
            color="blue"
          />
          <KpiCard
            icon={<IconClock />}
            label="DÍAS PROM. VENTA"
            value={advanced?.avg_days_to_sell ?? 0}
            sub="Días en stock antes de venderse"
            color="blue"
          />
        </div>

        {/* ── Period Selector ────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginRight: 4 }}>Período:</span>
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => handlePeriodChange(opt.value)}
              disabled={periodLoading}
              style={{
                padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                border: `1px solid ${period === opt.value ? 'var(--accent)' : 'var(--border)'}`,
                background: period === opt.value ? 'rgba(74,232,208,0.12)' : 'transparent',
                color: period === opt.value ? 'var(--accent)' : 'var(--text-muted)',
                cursor: periodLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                opacity: periodLoading ? 0.6 : 1,
              }}
            >
              {opt.label}
            </button>
          ))}
          {periodLoading && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>Actualizando...</span>
          )}
        </div>

        {/* ── Monthly Sales Chart ────────────────────────────── */}
        <div className="chart-wrapper" style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <div className="chart-title">Ventas Mensuales</div>
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

        {/* ── Stale Vehicles ────────────────────────────────── */}
        {advanced?.stale_vehicles?.length > 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header" style={{ paddingBottom: 16 }}>
              <span className="card-title" style={{ color: 'var(--danger)' }}>Vehículos Sin Movimiento</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Disponibles hace más de 30 días</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {advanced.stale_vehicles.map(v => (
                <Link
                  key={v.id}
                  to={`/vehicles/${v.id}`}
                  className="activity-row"
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44, height: 36, borderRadius: 6, flexShrink: 0,
                      background: 'var(--bg)', overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    }}>
                      {v.photo ? (
                        <img src={getPhotoSrc(v.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
                        <path d="M5 17H3a2 2 0 01-2-2v-4l2.5-6h13L19 11v4a2 2 0 01-2 2h-2"/>
                        <circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/>
                      </svg>
                    )}
                    </div>
                    <div className="activity-info">
                      <div className="activity-name">{v.brand} {v.model} {v.year}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--danger)' }}>
                      {v.days_in_stock} días
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>en stock</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Stock por Marca ────────────────────────────────── */}
        {advanced?.stock_by_brand?.length > 0 && (
          <div className="chart-wrapper" style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 20 }}>
              <div className="chart-title">Stock por Marca</div>
              <div className="chart-subtitle">Vehículos disponibles por marca</div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={advanced.stock_by_brand.slice(0, 10).map(b => ({ name: b.brand, count: parseInt(b.count) }))}
                margin={{ top: 4, right: 16, left: -10, bottom: 0 }}
                barCategoryGap="30%"
              >
                <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="transparent"
                  tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="transparent"
                  tick={{ fill: 'rgba(255,255,255,0.15)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="chart-tooltip">
                        <div className="chart-tooltip-title">{label}</div>
                        <div className="chart-tooltip-row">
                          <span className="chart-tooltip-dot" style={{ background: '#e8a040' }} />
                          <span>Disponibles: </span><strong>{payload[0].value}</strong>
                        </div>
                      </div>
                    )
                  }}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Bar dataKey="count" fill="#e8a040" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {advanced.stock_by_brand.slice(0, 10).map((entry, i) => (
                    <Cell key={i} fill={i === 0 ? '#e8a040' : '#e8a04090'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Seller Comparison Chart ───────────────────────── */}
        <div className="chart-wrapper" style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 4 }}>
            <div className="chart-title">Comparativo de Vendedores</div>
            <div className="chart-subtitle">Rendimiento individual — seleccioná la métrica</div>
          </div>
          {sellers.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <p>No hay vendedores registrados.</p>
            </div>
          ) : (
            <SellerComparisonChart sellers={sellers} />
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

        {/* ── Best Seller Highlight ──────────────────────────── */}
        {!isOwnView && sellers.length > 0 && parseFloat(sellers[0].total_revenue) > 0 && (
          <div className="card" style={{ marginBottom: 24, background: 'linear-gradient(135deg, rgba(232,160,64,0.08) 0%, rgba(232,160,64,0.03) 100%)', border: '1px solid rgba(232,160,64,0.25)' }}>
            <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(232,160,64,0.15)', border: '2px solid rgba(232,160,64,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#e8a040', fontSize: 22, fontWeight: 900,
              }}>
                {getInitials(sellers[0].name)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: '#e8a040', textTransform: 'uppercase', marginBottom: 4 }}>
                  Mejor Vendedor
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>{sellers[0].name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sellers[0].vehicles_sold} ventas · ticket promedio {formatCurrency(sellers[0].avg_ticket)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#e8a040' }}>{formatCurrency(sellers[0].total_revenue)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>facturación</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Top Sellers Table ──────────────────────────────── */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header" style={{ paddingBottom: 16 }}>
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
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: 22, height: 22, borderRadius: '50%', fontSize: 11, fontWeight: 800,
                              background: i === 0 ? 'rgba(232,160,64,0.2)' : i === 1 ? 'rgba(180,180,180,0.15)' : i === 2 ? 'rgba(180,120,60,0.15)' : 'transparent',
                              color: i === 0 ? '#e8a040' : i === 1 ? '#b0b0b0' : i === 2 ? '#b47840' : 'var(--text-muted)',
                              border: i < 3 ? `1px solid currentColor` : 'none',
                            }}>
                              {i + 1}
                            </span>
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

        {/* ── Alertas de Stock Viejo ─────────────────────────── */}
        {oldStock.length > 0 && (
          <div className="card" style={{ borderColor: 'rgba(232,160,64,0.3)', marginBottom: 24 }}>
            <div className="card-header" style={{ paddingBottom: 16 }}>
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
                Stock sin movimiento ({oldStock.length} vehículo{oldStock.length !== 1 ? 's' : ''})
              </span>
              <span style={{ fontSize: 12, color: 'rgba(232,160,64,0.9)', fontWeight: 600 }}>+{ALERT_DAYS} días disponible</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {oldStock.slice(0, 5).map(v => {
                const days = Math.floor((now - new Date(v.created_at)) / (1000 * 60 * 60 * 24))
                return (
                  <Link key={v.id} to={`/vehicles/${v.id}`} className="activity-row" style={{ borderLeft: '3px solid rgba(232,160,64,0.5)' }}>
                    <div className="activity-info">
                      <div className="activity-name">{v.brand} {v.model} {v.year ? `(${v.year})` : ''}</div>
                      <div className="activity-meta">
                        <span className={`tag tag-${v.type}`}>{DONUT_LABELS[v.type] || v.type || '—'}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {v.price && (
                        <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 14, marginBottom: 2 }}>
                          {formatCurrency(v.price)}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: 'rgba(232,160,64,0.85)', fontWeight: 600 }}>{days} días en stock</div>
                    </div>
                  </Link>
                )
              })}
              {oldStock.length > 5 && (
                <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                  +{oldStock.length - 5} más — <Link to="/vehicles?status=available" style={{ color: 'rgba(232,160,64,0.85)' }}>ver todos</Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Actividad Reciente ─────────────────────────────── */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: 16 }}>
            <span className="card-title">Actividad Reciente</span>
            <Link to="/vehicles" className="btn btn-secondary btn-sm">Ver todos</Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {recentVehicles.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
                    <path d="M5 17H3a2 2 0 01-2-2v-4l2.5-6h13L19 11v4a2 2 0 01-2 2h-2"/>
                    <circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/>
                  </svg>
                </span>
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
