export default function KpiCard({ icon, label, value, sub, color = 'blue', trend }) {
  return (
    <div className="kpi-card">
      <div className={`kpi-orb ${color}`} />
      <div className="kpi-top">
        <div className="kpi-icon-row">
          {icon && <span className="kpi-icon-emoji">{icon}</span>}
          <span className="kpi-label">{label}</span>
        </div>
      </div>
      <div className="kpi-bottom">
        <div className="kpi-value">{value}</div>
        {sub && <div className="kpi-sub">{sub}</div>}
        {trend !== undefined && (
          <div
            className="kpi-sub"
            style={{ color: trend >= 0 ? 'var(--success)' : 'var(--danger)', marginTop: 2 }}
          >
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
          </div>
        )}
      </div>
    </div>
  )
}
