import { useState, useEffect } from 'react'
import { getVehicleTestDrives, createTestDrive, updateTestDrive, getSellers } from '../api'
import { useAuth } from '../context/AuthContext'

function formatDateTime(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const STATUS_LABELS = {
  pending:   { label: 'Pendiente',  color: 'var(--warning)' },
  completed: { label: 'Completado', color: 'var(--success)' },
  cancelled: { label: 'Cancelado',  color: 'var(--danger)'  },
}

const EMPTY_FORM = {
  client_name: '', client_phone: '', client_email: '',
  scheduled_at: '', notes: '', seller_id: '',
}

// ── Cliente: simple request form ──────────────────────────────────
function ClientTestDriveForm({ vehicleId, vehicle }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    client_name: user?.name || '',
    client_email: user?.email || '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState(false)

  if (vehicle?.status !== 'available') return null

  // Visitors: prompt to log in first
  if (!user) {
    return (
      <div className="form-section">
        <div style={{
          fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 16,
          paddingBottom: 14, borderBottom: '1px solid var(--border)',
        }}>
          Solicitar Test Drive
        </div>
        <div style={{
          background: 'rgba(74,232,208,0.06)', border: '1px solid rgba(74,232,208,0.2)',
          borderRadius: 10, padding: '16px 20px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            Iniciá sesión para solicitar un test drive de este vehículo.
          </div>
          <a href="/login" className="btn btn-primary btn-sm">Iniciar sesión</a>
        </div>
      </div>
    )
  }

  const handleSubmit = async () => {
    if (!form.client_name || !form.scheduled_at) {
      setError('Tu nombre y la fecha/hora son requeridos.')
      return
    }
    setSubmitting(true); setError('')
    try {
      await createTestDrive(vehicleId, {
        client_name: form.client_name,
        client_phone: form.client_phone,
        client_email: form.client_email,
        scheduled_at: form.scheduled_at,
        notes: form.notes,
      })
      setSuccess(true)
      setForm(prev => ({ ...EMPTY_FORM, client_name: prev.client_name, client_email: prev.client_email }))
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="form-section">
      <div style={{
        fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 16,
        paddingBottom: 14, borderBottom: '1px solid var(--border)',
      }}>
        Solicitar Test Drive
      </div>

      {success ? (
        <div style={{
          background: 'rgba(74,232,208,0.08)', border: '1px solid rgba(74,232,208,0.25)',
          borderRadius: 10, padding: '16px 20px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>
            ¡Solicitud enviada!
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Nos pondremos en contacto para confirmar tu turno.
          </div>
          <button
            className="btn btn-secondary btn-sm"
            style={{ marginTop: 14 }}
            onClick={() => setSuccess(false)}
          >
            Hacer otra solicitud
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Tu nombre *</label>
              <input
                value={form.client_name}
                onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))}
                placeholder="Nombre completo"
              />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input
                value={form.client_phone}
                onChange={e => setForm(p => ({ ...p, client_phone: e.target.value }))}
                placeholder="+54 11..."
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email" value={form.client_email}
                onChange={e => setForm(p => ({ ...p, client_email: e.target.value }))}
                placeholder="tu@email.com"
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Fecha y hora preferida *</label>
              <input
                type="datetime-local" value={form.scheduled_at}
                onChange={e => setForm(p => ({ ...p, scheduled_at: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Comentarios</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Alguna consulta o preferencia horaria..."
                style={{ minHeight: 60 }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Enviando...' : 'Solicitar Test Drive'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Vendedor/Dueño: full management view ──────────────────────────
function ManagerTestDriveSection({ vehicleId }) {
  const [testDrives, setTestDrives] = useState([])
  const [sellers, setSellers]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  const load = () => {
    Promise.all([getVehicleTestDrives(vehicleId), getSellers()])
      .then(([td, s]) => {
        setTestDrives(td.data || [])
        setSellers(s.data || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [vehicleId])

  const handleCreate = async () => {
    if (!form.client_name || !form.scheduled_at) {
      setError('Nombre del cliente y fecha/hora son requeridos.')
      return
    }
    setSubmitting(true); setError('')
    try {
      const res = await createTestDrive(vehicleId, {
        ...form,
        seller_id: form.seller_id ? parseInt(form.seller_id) : null,
      })
      setTestDrives(prev => [res.data, ...prev])
      setShowModal(false)
      setForm(EMPTY_FORM)
    } catch (err) { setError(err.message) }
    finally { setSubmitting(false) }
  }

  const handleStatus = async (id, status) => {
    try {
      const res = await updateTestDrive(id, { status })
      setTestDrives(prev => prev.map(td => td.id === id ? { ...td, ...res.data } : td))
    } catch (err) { alert('Error: ' + err.message) }
  }

  return (
    <div className="form-section">
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
          Turnos & Test Drives
        </span>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowModal(true); setError('') }}>
          + Agendar Turno
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: 13 }}>Cargando...</div>
      ) : testDrives.length === 0 ? (
        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          No hay turnos agendados para este vehículo.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {testDrives.map(td => {
            const st = STATUS_LABELS[td.status] || STATUS_LABELS.pending
            return (
              <div key={td.id} className="test-drive-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{td.client_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
                      {td.client_phone && <span>📞 {td.client_phone}</span>}
                      {td.client_email && <span>✉️ {td.client_email}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      <span>🗓 {formatDateTime(td.scheduled_at)}</span>
                      {td.seller_name && <span>👤 {td.seller_name}</span>}
                    </div>
                    {td.notes && (
                      <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 6, fontStyle: 'italic' }}>
                        {td.notes}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                      background: `${st.color}22`, color: st.color, border: `1px solid ${st.color}44`,
                      textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>
                      {st.label}
                    </span>
                    {td.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-success btn-sm"
                          style={{ padding: '4px 10px', fontSize: 11 }}
                          onClick={() => handleStatus(td.id, 'completed')}
                        >Completar</button>
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ padding: '4px 10px', fontSize: 11 }}
                          onClick={() => handleStatus(td.id, 'cancelled')}
                        >Cancelar</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-title">Agendar Test Drive</div>
            {error && <div className="alert alert-danger">{error}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Nombre del Cliente *</label>
                  <input
                    value={form.client_name}
                    onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))}
                    placeholder="Nombre completo"
                  />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    value={form.client_phone}
                    onChange={e => setForm(p => ({ ...p, client_phone: e.target.value }))}
                    placeholder="+54 11..."
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email" value={form.client_email}
                    onChange={e => setForm(p => ({ ...p, client_email: e.target.value }))}
                    placeholder="email@ejemplo.com"
                  />
                </div>
                <div className="form-group">
                  <label>Fecha y Hora *</label>
                  <input
                    type="datetime-local" value={form.scheduled_at}
                    onChange={e => setForm(p => ({ ...p, scheduled_at: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Vendedor Asignado</label>
                  <select value={form.seller_id} onChange={e => setForm(p => ({ ...p, seller_id: e.target.value }))}>
                    <option value="">Sin asignar</option>
                    {sellers.filter(s => s.active).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Notas</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Notas adicionales..."
                    style={{ minHeight: 60 }}
                  />
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={submitting}>
                {submitting ? 'Agendando...' : 'Agendar Turno'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main export: switches based on role ───────────────────────────
export default function TestDriveSection({ vehicleId, vehicle }) {
  const { user, loading: authLoading } = useAuth()
  const canManage = user && (user.role === 'vendedor' || user.role === 'dueno')

  if (authLoading) return null // don't flash the wrong UI while auth resolves
  if (canManage) return <ManagerTestDriveSection vehicleId={vehicleId} />
  return <ClientTestDriveForm vehicleId={vehicleId} vehicle={vehicle} />
}
