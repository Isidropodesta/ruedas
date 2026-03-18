import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyTestDrives, cancelMyTestDrive } from '../api'
import { useAuth } from '../context/AuthContext'

const BASE_URL = import.meta.env.VITE_API_URL || ''

function getPhotoSrc(url) {
  if (!url) return null
  if (url.startsWith('http')) return url
  return BASE_URL + url
}

const STATUS_STYLES = {
  pending: { bg: 'rgba(232,200,64,0.12)', color: '#e8c840', label: 'Pendiente' },
  completed: { bg: 'rgba(61,232,138,0.12)', color: '#3de88a', label: 'Completado' },
  cancelled: { bg: 'rgba(232,80,64,0.12)', color: '#e85040', label: 'Cancelado' },
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function MyTestDrives() {
  const { user } = useAuth()
  const [testDrives, setTestDrives] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(null)

  const handleCancel = async (id) => {
    if (!confirm('¿Cancelar este turno?')) return
    setCancelling(id)
    try {
      await cancelMyTestDrive(id)
      setTestDrives(prev => prev.map(td => td.id === id ? { ...td, status: 'cancelled' } : td))
    } catch (err) {
      alert(err.message)
    } finally {
      setCancelling(null)
    }
  }

  useEffect(() => {
    if (!user) return
    getMyTestDrives()
      .then(res => setTestDrives(res.data || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  if (!user) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🔒</div>
        <h3>Necesitás estar logueado</h3>
        <p>Iniciá sesión para ver tus turnos de test drive.</p>
        <Link to="/login" className="btn btn-primary" style={{ marginTop: 16 }}>
          Iniciar sesión
        </Link>
      </div>
    )
  }

  if (loading) return <div className="loading">Cargando turnos...</div>

  if (error) return (
    <div className="alert alert-danger">Error al cargar turnos: {error}</div>
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Mis Turnos</h2>
          <p>Test drives solicitados por vos</p>
        </div>
      </div>

      {testDrives.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>Sin turnos aún</h3>
          <p>Todavía no solicitaste ningún test drive.</p>
          <Link to="/vehicles" className="btn btn-primary" style={{ marginTop: 16 }}>
            Ver vehículos disponibles
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {testDrives.map(td => {
            const status = STATUS_STYLES[td.status] || STATUS_STYLES.pending
            const photo = getPhotoSrc(td.vehicle_photo)
            return (
              <div
                key={td.id}
                className="card"
                style={{ padding: 0, overflow: 'hidden' }}
              >
                <div style={{ display: 'flex', gap: 0 }}>
                  {/* Photo */}
                  <div style={{
                    width: 120, flexShrink: 0,
                    background: 'var(--bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 32,
                  }}>
                    {photo ? (
                      <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      '🚗'
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <Link
                          to={`/vehicles/${td.vehicle_id}`}
                          style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', textDecoration: 'none' }}
                        >
                          {td.brand} {td.model} {td.year}
                        </Link>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          Turno #{td.id}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                        background: status.bg, color: status.color,
                        border: `1px solid ${status.color}33`,
                        flexShrink: 0,
                      }}>
                        {status.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                          Fecha del turno
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
                          📅 {formatDate(td.scheduled_at)}
                        </div>
                      </div>
                      {td.notes && (
                        <div style={{ flex: 1, minWidth: 150 }}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                            Notas
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {td.notes}
                          </div>
                        </div>
                      )}
                      {td.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(td.id)}
                          disabled={cancelling === td.id}
                          style={{
                            marginLeft: 'auto', padding: '6px 14px', borderRadius: 8,
                            border: '1px solid rgba(232,80,64,0.4)',
                            background: 'rgba(232,80,64,0.08)',
                            color: '#e85040', fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(232,80,64,0.18)'; e.currentTarget.style.borderColor = 'rgba(232,80,64,0.7)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(232,80,64,0.08)'; e.currentTarget.style.borderColor = 'rgba(232,80,64,0.4)' }}
                        >
                          {cancelling === td.id ? 'Cancelando...' : 'Cancelar turno'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
