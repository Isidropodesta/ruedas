export default function KpiCard({ icon, label, value, sub, color = 'blue' }) {
  return (
    <div className="kpi-card">
      <div className={`kpi-orb ${color}`} />
      <div className="kpi-top">
        <span className="kpi-emoji">{icon}</span>
        <span className="kpi-label">{label}</span>
      </div>
      <div>
        <div className="kpi-value">{value}</div>
        <div className="kpi-sub">{sub}</div>
      </div>
    </div>
  )
}
