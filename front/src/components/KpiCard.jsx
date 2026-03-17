import { useEffect, useState } from 'react'

function useCountUp(target, duration = 1200) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!target || isNaN(Number(target))) return
    const num = parseFloat(String(target).replace(/[^0-9.]/g, ''))
    if (num === 0) return
    const start = performance.now()
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease out cubic
      setCount(Math.floor(eased * num))
      if (progress < 1) requestAnimationFrame(tick)
      else setCount(num)
    }
    requestAnimationFrame(tick)
  }, [target])
  return count
}

function MiniSparkline({ color }) {
  // decorative SVG sparkline
  const pts = "0,18 8,14 16,16 24,10 32,13 40,7 48,11 56,5 64,9"
  return (
    <svg width="64" height="20" style={{ display: 'block', opacity: 0.5 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function KpiCard({ icon, label, value, sub, color = 'blue', trend, isCurrency }) {
  // value can be number or formatted string like "$12,000"
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.]/g, '')) : value
  const animated = useCountUp(numericValue)

  const displayValue = isCurrency
    ? `$${animated.toLocaleString('es-AR')}`
    : animated.toLocaleString('es-AR')

  const sparkColors = {
    blue: '#4a8fe8',
    green: '#3de88a',
    red: '#e86050',
    gray: '#8a7060',
    gold: '#e8c840',
  }

  return (
    <div className={`kpi-card kpi-card-${color}`}>
      <div className={`kpi-orb ${color}`} />
      <div className="kpi-top">
        <span className="kpi-emoji">{icon}</span>
        <span className="kpi-label">{label}</span>
      </div>
      <div className="kpi-bottom">
        <div className="kpi-value">{displayValue}</div>
        <div className="kpi-sub-row">
          <span className="kpi-sub">{sub}</span>
          {trend !== undefined && (
            <span className={`kpi-trend ${trend >= 0 ? 'up' : 'down'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
        </div>
        <div className="kpi-sparkline">
          <MiniSparkline color={sparkColors[color] || '#fff'} />
        </div>
      </div>
    </div>
  )
}
