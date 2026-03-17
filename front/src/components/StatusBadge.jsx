const labels = {
  available: 'Disponible',
  sold: 'Vendido',
  withdrawn: 'Retirado',
}

export default function StatusBadge({ status }) {
  return (
    <span className={`status-badge ${status}`}>
      <span className="status-dot" />
      {labels[status] || status}
    </span>
  )
}
