import { useState, useEffect } from 'react'
import { getAllTestDrives, updateTestDrive, deleteTestDrive, createTestDrive, getVehicles, getSellers } from '../api'

function formatDateTime(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const STATUS_CONFIG = {
  pending:   { label: 'Pendiente',  color: 'var(--warning)',  bg: 'rgba(232,200,64,0.12)',  border: 'rgba(232,200,64,0.3)' },
  completed: { label: 'Completado', color: 'var(--success)',  bg: 'rgba(61,232,138,0.12)',  border: 'rgba(61,232,138,0.3)' },
  cancelled: { label: 'Cancelado',  color: 'var(--danger)',   bg: 'rgba(232,80,64,0.12)',   border: 'rgba(232,80,64,0.3)' },
}

const TABS = [
  { key: 'all',       label: 'Todos' },
  { key: 'pending',   label: 'Pendientes' },
  { key: 'completed', label: 'Completados' },
  { key: 'cancelled', label: 'Cancelados' },
]

export default function TestDrives() {
  const [allDrives, setAllDrives] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [sellers, setSellers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    vehicle_id: '', client_name: '', client_phone: '', client_email: '',
    scheduled_at: '', notes: '', seller_id: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([getAllTestDrives(), getVehicles(), getSellers()])
      .then(([td, v, s]) => {
        setAllDrives(td.data || [])
        setVehicles(v.data || [])
        setSellers(s.data || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = activeTab === 'all'
    ? allDrives
    : allDrives.filter(td => td.status === activeTab)

  const [changingId, setChangingId] = useState(null)

  const handleStatus = async (id, status) => {
    setChangingId(id)
    try {
      const res = await updateTestDrive(id, { status })
      setAllDrives(prev => prev.map(td => td.id === id ? { ...td, ...res.data } : td))
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setChangingId(null)
    }
  }

  const handleCreate = async () => {
    if (!form.vehicle_id || !form.client_name || !form.scheduled_at) {
      setFormError('Vehículo, nombre del cliente y fecha son requeridos.')
      return
    }
    setSubmitting(true)
    setFormError('')
    try {
      const res = await createTestDrive(parseInt(form.vehicle_id), {
        client_name: form.client_name,
        client_phone: form.client_phone,
        client_email: form.client_email,
        scheduled_at: form.scheduled_at,
        notes: form.notes,
        seller_id: form.seller_id ? parseInt(form.seller_id) : null,
      })
      // Re-fetch to get vehicle name info
      const newDrive = res.data
      const vehicle = vehicles.find(v => v.id === parseInt(form.vehicle_id))
      const seller = sellers.find(s => s.id === parseInt(form.seller_id))
      setAllDrives(prev => [{
        ...newDrive,
        brand: vehicle?.brand,
        model: vehicle?.model,
        year: vehicle?.year,
        vehicle_photo: vehicle?.photos?.[0]?.url || null,
        seller_name: seller?.name || null,
      }, ...prev])
      setShowModal(false)
      setForm({ vehicle_id: '', client_name: '', client_phone: '', client_email: '', scheduled_at: '', notes: '', seller_id: '' })
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const tabCounts = {
    all: allDrives.length,
    pending: allDrives.filter(d => d.status === 'pending').length,
    completed: allDrives.filter(d => d.status === 'completed').length,
    cancelled: allDrives.filter(d => d.status === 'cancelled').length,
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Turnos &amp; Test Drives</h2>
          <p>Gestioná los turnos de prueba de manejo</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowModal(true); setFormError('') }}>
          + Agendar Turno
        </button>
      </div>

      {/* Tabs */}
      <div className="td-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`td-tab${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            <span className="td-tab-count">{tabCounts[tab.key]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">Cargando turnos...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🗓</span>
          <h3>No hay turnos</h3>
          <p>No hay turnos {activeTab !== 'all' ? `con estado "${STATUS_CONFIG[activeTab]?.label}"` : 'registrados'} aún.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(td => {
            const st = STATUS_CONFIG[td.status] || STATUS_CONFIG.pending
            const photoUrl = td.vehicle_photo
            return (
              <div key={td.id} className="test-drive-card">
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  {/* Vehicle thumb */}
                  <div style={{ flexShrink: 0 }}>
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt="vehicle"
                        style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }}
                      />
                    ) : (
                      <div style={{
                        width: 80, height: 60, borderRadius: 8, background: 'var(--bg-card-hover)',
                        border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 24,
                      }}>🚗</div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                          {td.brand && td.model ? `${td.brand} ${td.model} ${td.year || ''}` : `Vehículo #${td.vehicle_id}`}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent)', marginTop: 2 }}>
                          {td.client_name}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                        background: st.bg, color: st.color, border: `1px solid ${st.border}`,
                        textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0,
                      }}>
                        {st.label}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
                      <span>🗓 {formatDateTime(td.scheduled_at)}</span>
                      {td.client_phone && <span>📞 {td.client_phone}</span>}
                      {td.client_email && <span>✉️ {td.client_email}</span>}
                      {td.seller_name && <span>👤 {td.seller_name}</span>}
                    </div>

                    {td.notes && (
                      <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 6, fontStyle: 'italic' }}>
                        {td.notes}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cambiar estado:</span>
                      {['pending', 'completed', 'cancelled']
                        .filter(s => s !== td.status)
                        .map(s => (
                          <button
                            key={s}
                            disabled={changingId === td.id}
                            className={`btn btn-sm ${s === 'completed' ? 'btn-success' : s === 'cancelled' ? 'btn-danger' : 'btn-secondary'}`}
                            onClick={() => handleStatus(td.id, s)}
                          >
                            {changingId === td.id ? '...' : STATUS_CONFIG[s].label}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-title">Agendar Test Drive</div>
            {formError && <div className="alert alert-danger">{formError}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label>Vehículo *</label>
                <select
                  value={form.vehicle_id}
                  onChange={e => setForm(p => ({ ...p, vehicle_id: e.target.value }))}
                >
                  <option value="">Seleccioná un vehículo</option>
                  {vehicles.filter(v => v.status === 'available').map(v => (
                    <option key={v.id} value={v.id}>
                      {v.brand} {v.model} {v.year} — {parseInt(v.km || 0).toLocaleString('es-AR')} km
                    </option>
                  ))}
                </select>
              </div>
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
                    type="email"
                    value={form.client_email}
                    onChange={e => setForm(p => ({ ...p, client_email: e.target.value }))}
                    placeholder="email@ejemplo.com"
                  />
                </div>
                <div className="form-group">
                  <label>Fecha y Hora *</label>
                  <input
                    type="datetime-local"
                    value={form.scheduled_at}
                    onChange={e => setForm(p => ({ ...p, scheduled_at: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Vendedor Asignado</label>
                  <select
                    value={form.seller_id}
                    onChange={e => setForm(p => ({ ...p, seller_id: e.target.value }))}
                  >
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
