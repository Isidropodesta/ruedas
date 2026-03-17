export default function KpiCard({ icon, iconColor = 'blue', title, value, subtitle, trend }) {
  return (
    <div className="kpi-card">
      <div className={`kpi-icon ${iconColor}`}>
        {icon}
      </div>
      <div className="kpi-body">
        <div className="kpi-label">{title}</div>
        <div className="kpi-value">{value}</div>
        {subtitle && <div className="kpi-sub">{subtitle}</div>}
        {trend !== undefined && (
          <div className={`kpi-sub`} style={{ color: trend >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
          </div>
        )}
      </div>
    </div>
  )
}
