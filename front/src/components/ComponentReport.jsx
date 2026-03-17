import { useState, useEffect } from 'react'
import { getVehicleReport, saveVehicleReport } from '../api'

const COMPONENTS = [
  { key: 'motor', label: 'Motor', icon: '⚙️' },
  { key: 'transmision', label: 'Transmisión', icon: '🔧' },
  { key: 'frenos_del', label: 'Frenos Delanteros', icon: '🔴' },
  { key: 'frenos_tras', label: 'Frenos Traseros', icon: '🔴' },
  { key: 'suspension_del', label: 'Suspensión Delantera', icon: '🔩' },
  { key: 'suspension_tras', label: 'Suspensión Trasera', icon: '🔩' },
  { key: 'direccion', label: 'Dirección', icon: '🎡' },
  { key: 'neumaticos', label: 'Neumáticos', icon: '⭕' },
  { key: 'carroceria', label: 'Carrocería', icon: '🚗' },
  { key: 'pintura', label: 'Pintura', icon: '🎨' },
  { key: 'vidrios', label: 'Vidrios', icon: '🪟' },
  { key: 'interior', label: 'Interior', icon: '💺' },
  { key: 'tapizado', label: 'Tapizado', icon: '🪑' },
  { key: 'aire_acondicionado', label: 'Aire Acondicionado', icon: '❄️' },
  { key: 'sistema_electrico', label: 'Sistema Eléctrico', icon: '⚡' },
  { key: 'bateria', label: 'Batería', icon: '🔋' },
  { key: 'luces', label: 'Luces', icon: '💡' },
]

const DEFAULT_REPORT = {
  motor: { estado: 'excelente', obs: '' },
  transmision: { estado: 'bueno', obs: '' },
  frenos_del: { estado: 'bueno', obs: '' },
  frenos_tras: { estado: 'bueno', obs: '' },
  suspension_del: { estado: 'bueno', obs: '' },
  suspension_tras: { estado: 'bueno', obs: '' },
  direccion: { estado: 'excelente', obs: '' },
  neumaticos: { estado: 'bueno', obs: '', medida: '' },
  carroceria: { estado: 'bueno', obs: '' },
  pintura: { estado: 'bueno', obs: '' },
  vidrios: { estado: 'excelente', obs: '' },
  interior: { estado: 'bueno', obs: '' },
  tapizado: { estado: 'bueno', obs: '' },
  aire_acondicionado: { estado: 'excelente', obs: '' },
  sistema_electrico: { estado: 'bueno', obs: '' },
  bateria: { estado: 'bueno', obs: '' },
  luces: { estado: 'excelente', obs: '' },
  km_verificado: true,
  inspeccionado_por: '',
  fecha_inspeccion: '',
  observaciones_generales: '',
}

const ESTADOS = [
  { value: 'excelente', label: 'Excelente' },
  { value: 'bueno', label: 'Bueno' },
  { value: 'regular', label: 'Regular' },
  { value: 'necesita_atencion', label: 'Necesita Atención' },
  { value: 'n/a', label: 'N/A' },
]

function ConditionBadge({ estado }) {
  return (
    <span className={`condition-badge condition-badge-${estado === 'necesita_atencion' ? 'atencion' : (estado === 'n/a' ? 'na' : estado)}`}>
      {ESTADOS.find(e => e.value === estado)?.label || estado}
    </span>
  )
}

export default function ComponentReport({ vehicleId, readOnly = false }) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getVehicleReport(vehicleId)
      .then(res => {
        const data = res.data
        if (data && Object.keys(data).length > 0) {
          setReport(data)
        } else {
          setReport(null)
        }
      })
      .catch(() => setReport(null))
      .finally(() => setLoading(false))
  }, [vehicleId])

  const handleGenerate = () => {
    setDraft({ ...DEFAULT_REPORT })
    setEditing(true)
  }

  const handleEdit = () => {
    setDraft({ ...report })
    setEditing(true)
  }

  const handleCancel = () => {
    setEditing(false)
    setDraft(null)
    setError('')
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await saveVehicleReport(vehicleId, draft)
      setReport(res.data)
      setEditing(false)
      setDraft(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const updateComponent = (key, field, value) => {
    setDraft(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }))
  }

  const updateMeta = (field, value) => {
    setDraft(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="form-section">
        <div className="form-section-title">Informe de Componentes</div>
        <div className="loading" style={{ padding: '20px 0' }}>Cargando informe...</div>
      </div>
    )
  }

  const currentData = editing ? draft : report

  return (
    <div className="form-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
          Informe de Componentes
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saved && <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>Guardado</span>}
          {!readOnly && !editing && report && (
            <button className="btn btn-secondary btn-sm" onClick={handleEdit}>Editar Informe</button>
          )}
          {!readOnly && !editing && !report && (
            <button className="btn btn-primary btn-sm" onClick={handleGenerate}>Generar Informe</button>
          )}
        </div>
      </div>

      {!report && !editing && (
        <div className="empty-state" style={{ padding: '32px 0' }}>
          <span className="empty-icon">🔍</span>
          <h3>Sin informe</h3>
          <p style={{ marginTop: 6, fontSize: 13 }}>No se ha realizado una inspección de componentes para este vehículo.</p>
          {!readOnly && (
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={handleGenerate}>
              Generar Informe
            </button>
          )}
        </div>
      )}

      {(report || editing) && currentData && (
        <>
          {error && <div className="alert alert-danger" style={{ marginBottom: 14 }}>{error}</div>}

          <div className="report-grid">
            {COMPONENTS.map(({ key, label, icon }) => {
              const comp = currentData[key] || { estado: 'bueno', obs: '' }
              return (
                <div className="report-row" key={key}>
                  <span className="report-row-icon">{icon}</span>
                  <span className="report-row-label">{label}</span>
                  {editing ? (
                    <div className="report-row-edit">
                      <select
                        value={comp.estado || 'bueno'}
                        onChange={e => updateComponent(key, 'estado', e.target.value)}
                      >
                        {ESTADOS.map(e => (
                          <option key={e.value} value={e.value}>{e.label}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Observación..."
                        value={comp.obs || ''}
                        onChange={e => updateComponent(key, 'obs', e.target.value)}
                      />
                      {key === 'neumaticos' && (
                        <input
                          type="text"
                          placeholder="Medida (ej: 205/55R16)"
                          value={comp.medida || ''}
                          onChange={e => updateComponent(key, 'medida', e.target.value)}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="report-row-view">
                      <ConditionBadge estado={comp.estado || 'bueno'} />
                      {comp.obs && <span className="report-row-obs">{comp.obs}</span>}
                      {key === 'neumaticos' && comp.medida && (
                        <span className="report-row-obs" style={{ color: 'var(--text-muted)' }}>{comp.medida}</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="report-meta-row">
                  <label className="report-meta-label">
                    <input
                      type="checkbox"
                      checked={!!draft.km_verificado}
                      onChange={e => updateMeta('km_verificado', e.target.checked)}
                      style={{ marginRight: 8, accentColor: 'var(--accent)' }}
                    />
                    KM Verificado
                  </label>
                </div>
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="form-group">
                    <label>Inspeccionado por</label>
                    <input
                      type="text"
                      placeholder="Nombre del inspector"
                      value={draft.inspeccionado_por || ''}
                      onChange={e => updateMeta('inspeccionado_por', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Fecha de Inspección</label>
                    <input
                      type="date"
                      value={draft.fecha_inspeccion || ''}
                      onChange={e => updateMeta('fecha_inspeccion', e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Observaciones Generales</label>
                  <textarea
                    placeholder="Notas generales sobre el vehículo..."
                    value={draft.observaciones_generales || ''}
                    onChange={e => updateMeta('observaciones_generales', e.target.value)}
                    style={{ minHeight: 80 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary btn-sm" onClick={handleCancel}>Cancelar</button>
                  <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar Informe'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13 }}>
                  <span>
                    <span style={{ color: 'var(--text-soft)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>KM: </span>
                    <span style={{ color: currentData.km_verificado ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                      {currentData.km_verificado ? 'Verificado' : 'No verificado'}
                    </span>
                  </span>
                  {currentData.inspeccionado_por && (
                    <span>
                      <span style={{ color: 'var(--text-soft)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Inspector: </span>
                      <span style={{ fontWeight: 600 }}>{currentData.inspeccionado_por}</span>
                    </span>
                  )}
                  {currentData.fecha_inspeccion && (
                    <span>
                      <span style={{ color: 'var(--text-soft)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Fecha: </span>
                      <span style={{ fontWeight: 600 }}>
                        {new Date(currentData.fecha_inspeccion + 'T00:00:00').toLocaleDateString('es-AR')}
                      </span>
                    </span>
                  )}
                </div>
                {currentData.observaciones_generales && (
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)' }}>
                    {currentData.observaciones_generales}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
