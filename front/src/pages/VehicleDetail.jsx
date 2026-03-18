import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getVehicle, updateVehicleStatus, deleteVehicle, getSellers, getVehiclePriceHistory } from '../api'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import ComponentReport from '../components/ComponentReport'
import TestDriveSection from '../components/TestDriveSection'
import FinancingCalc from '../components/FinancingCalc'

const typeLabels = { utility: 'Utilitario', road: 'Ruta', luxury: 'Lujo' }

function formatCurrency(n) {
  const num = parseFloat(n) || 0
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(num)
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateTime(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function FeatureValue({ label, value }) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'boolean') {
    return (
      <span className={`feature-tag ${value ? 'yes' : ''}`}>
        {value ? '✓' : '✗'} {label}
      </span>
    )
  }
  return <span className="feature-tag">{label}: {value}</span>
}

const featureLabels = {
  traccion: 'Tracción', combustible: 'Combustible', puertas: 'Puertas',
  capacidad_carga_kg: 'Cap. Carga (kg)', payload_kg: 'Payload (kg)',
  aire_acondicionado: 'Aire Acond.', transmision: 'Transmisión',
  consumo_l100km: 'Consumo (L/100km)', autonomia_km: 'Autonomía (km)',
  baul_litros: 'Baúl (L)', bluetooth: 'Bluetooth', camara_reversa: 'Cámara Reversa',
  asientos_cuero: 'Asientos Cuero', techo_solar: 'Techo Solar',
  audio_premium: 'Audio Premium', cruise_adaptativo: 'Cruise Adaptativo',
  punto_ciego: 'Punto Ciego', sensores_estacionamiento: 'Sensores Estacionamiento',
  camara_360: 'Cámara 360°', asientos: 'Asientos',
}

const BASE_URL = import.meta.env.VITE_API_URL || ''

function getPhotoSrc(p) {
  if (!p) return ''
  const url = p.url || p
  if (typeof url === 'string' && !url.startsWith('http') && BASE_URL) return BASE_URL + url
  return url
}

export default function VehicleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const canManage = user && (user.role === 'vendedor' || user.role === 'dueno')
  const canDelete = user && user.role === 'dueno'

  const [vehicle, setVehicle]               = useState(null)
  const [sellers, setSellers]               = useState([])
  const [loading, setLoading]               = useState(true)
  const [activePhoto, setActivePhoto]       = useState(0)
  const [showSellModal, setShowSellModal]   = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [sellForm, setSellForm]             = useState({ seller_id: '', sale_price: '' })
  const [withdrawForm, setWithdrawForm]     = useState({ withdrawal_reason: '' })
  const [submitting, setSubmitting]         = useState(false)
  const [error, setError]                   = useState('')
  const [publicCopied, setPublicCopied]     = useState(false)

  // Lightbox state
  const [lightboxOpen, setLightboxOpen]     = useState(false)
  const [lightboxIndex, setLightboxIndex]   = useState(0)

  // Price history
  const [priceHistory, setPriceHistory]     = useState([])

  // Load vehicle immediately — public route, no auth needed
  useEffect(() => {
    setLoading(true)
    getVehicle(id)
      .then(res => setVehicle(res.data))
      .catch(err => console.error('VehicleDetail load error:', err))
      .finally(() => setLoading(false))
  }, [id])

  // Load sellers only for managers, after auth resolves
  useEffect(() => {
    if (authLoading || !canManage) return
    getSellers()
      .then(res => setSellers(res.data || []))
      .catch(() => {})
  }, [id, authLoading, canManage])

  // Load price history for managers
  useEffect(() => {
    if (!canManage || !id) return
    getVehiclePriceHistory(id)
      .then(res => setPriceHistory(res.data || []))
      .catch(() => {})
  }, [id, canManage])

  // ESC to close lightbox
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') setLightboxOpen(false)
      if (e.key === 'ArrowRight' && lightboxOpen) {
        setLightboxIndex(i => (i + 1) % (vehicle?.photos?.length || 1))
      }
      if (e.key === 'ArrowLeft' && lightboxOpen) {
        setLightboxIndex(i => (i - 1 + (vehicle?.photos?.length || 1)) % (vehicle?.photos?.length || 1))
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [lightboxOpen, vehicle])

  const handleSell = async () => {
    if (!sellForm.seller_id || !sellForm.sale_price) {
      setError('Seleccioná un vendedor e ingresá el precio de venta.')
      return
    }
    setSubmitting(true); setError('')
    try {
      const res = await updateVehicleStatus(id, {
        status: 'sold',
        seller_id: parseInt(sellForm.seller_id),
        sale_price: parseFloat(sellForm.sale_price),
      })
      setVehicle(prev => ({ ...prev, ...res.data }))
      setShowSellModal(false)
    } catch (err) { setError(err.message) }
    finally { setSubmitting(false) }
  }

  const handleWithdraw = async () => {
    if (!withdrawForm.withdrawal_reason) { setError('Ingresá el motivo de retiro.'); return }
    setSubmitting(true); setError('')
    try {
      const res = await updateVehicleStatus(id, {
        status: 'withdrawn',
        withdrawal_reason: withdrawForm.withdrawal_reason,
      })
      setVehicle(prev => ({ ...prev, ...res.data }))
      setShowWithdrawModal(false)
    } catch (err) { setError(err.message) }
    finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro que querés eliminar este vehículo?')) return
    try {
      await deleteVehicle(id)
      navigate('/vehicles')
    } catch (err) { alert('Error al eliminar: ' + err.message) }
  }

  const handleMakeAvailable = async () => {
    try {
      const res = await updateVehicleStatus(id, { status: 'available' })
      setVehicle(prev => ({ ...prev, ...res.data }))
    } catch (err) { alert('Error: ' + err.message) }
  }

  const handleSharePublic = () => {
    const url = `${window.location.origin}/public/vehicles/${id}`
    navigator.clipboard.writeText(url)
      .then(() => { setPublicCopied(true); setTimeout(() => setPublicCopied(false), 2000) })
      .catch(() => prompt('Copiá este enlace:', url))
  }

  if (loading) return <div className="loading">Cargando vehículo...</div>
  if (!vehicle) return <div className="alert alert-danger">Vehículo no encontrado.</div>

  const photos = vehicle.photos || []
  const features = vehicle.features || {}

  return (
    <div>
      <Link to="/vehicles" className="back-link">← Volver a Vehículos</Link>

      <div className="page-header">
        <div>
          <h2>
            {vehicle.brand} {vehicle.model}{' '}
            <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 18 }}>{vehicle.year}</span>
          </h2>
          <div style={{ marginTop: 6, display: 'flex', gap: 10, alignItems: 'center' }}>
            <StatusBadge status={vehicle.status} />
            <span className={`tag tag-${vehicle.type}`}>{typeLabels[vehicle.type]}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to={`/public/vehicles/${id}`} target="_blank" rel="noopener noreferrer" className="btn btn-dark">
            Ver Ficha Pública
          </Link>
          <button className="btn btn-dark" onClick={handleSharePublic}>
            {publicCopied ? '¡Copiado!' : 'Compartir'}
          </button>
          {canManage && (
            <Link to={`/vehicles/${id}/edit`} className="btn btn-secondary" onClick={e => {
              e.preventDefault(); navigate(`/vehicles/${id}`, { state: { edit: true } })
            }}>
              Editar
            </Link>
          )}
          {canDelete && (
            <button className="btn btn-danger" onClick={handleDelete}>Eliminar</button>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <div>
          {/* Photo Gallery */}
          {photos.length > 0 ? (
            <div style={{ marginBottom: 20 }}>
              <img
                className="photo-main"
                src={getPhotoSrc(photos[activePhoto])}
                alt="Principal"
                style={{ cursor: 'zoom-in' }}
                onClick={() => { setLightboxIndex(activePhoto); setLightboxOpen(true) }}
              />
              {photos.length > 1 && (
                <div className="photo-gallery">
                  {photos.map((p, i) => (
                    <img
                      key={i} src={getPhotoSrc(p)} alt={`Foto ${i + 1}`}
                      className={i === activePhoto ? 'active' : ''}
                      onClick={() => setActivePhoto(i)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="vehicle-card-img-placeholder" style={{ height: 280, marginBottom: 20, borderRadius: 8 }}>
              🚗
            </div>
          )}

          {/* Main Info */}
          <div className="form-section">
            <div className="form-section-title">Información Principal</div>
            <div className="info-list">
              <div className="info-item"><div className="label">Marca</div><div className="value">{vehicle.brand}</div></div>
              <div className="info-item"><div className="label">Modelo</div><div className="value">{vehicle.model}</div></div>
              <div className="info-item"><div className="label">Año</div><div className="value">{vehicle.year}</div></div>
              <div className="info-item">
                <div className="label">Kilometraje</div>
                <div className="value">{parseInt(vehicle.km || 0).toLocaleString('es-AR')} km</div>
              </div>
              <div className="info-item"><div className="label">Color</div><div className="value">{vehicle.color || '-'}</div></div>
              <div className="info-item"><div className="label">Tipo</div><div className="value">{typeLabels[vehicle.type]}</div></div>
              <div className="info-item">
                <div className="label">Precio Mínimo</div>
                <div className="value" style={{ color: 'var(--accent)' }}>
                  {vehicle.price_min ? formatCurrency(vehicle.price_min) : '-'}
                </div>
              </div>
              <div className="info-item">
                <div className="label">Precio Máximo</div>
                <div className="value" style={{ color: 'var(--accent)' }}>
                  {vehicle.price_max ? formatCurrency(vehicle.price_max) : '-'}
                </div>
              </div>
              <div className="info-item">
                <div className="label">Ingresado</div>
                <div className="value">{formatDate(vehicle.created_at)}</div>
              </div>
            </div>
            {vehicle.description && (
              <div style={{ marginTop: 16 }}>
                <div className="info-item">
                  <div className="label">Descripción</div>
                  <div className="value" style={{ fontWeight: 400, marginTop: 4 }}>{vehicle.description}</div>
                </div>
              </div>
            )}
          </div>

          {/* Features */}
          {Object.keys(features).length > 0 && (
            <div className="form-section">
              <div className="form-section-title">Características</div>
              <div className="feature-tags">
                {Object.entries(features).map(([k, v]) => (
                  <FeatureValue key={k} label={featureLabels[k] || k} value={v} />
                ))}
              </div>
            </div>
          )}

          {/* Component Report — read-only for clients */}
          <ComponentReport vehicleId={id} readOnly={!canManage} />

          {/* Test Drive Section */}
          <TestDriveSection vehicleId={id} vehicle={vehicle} />
        </div>

        {/* Right panel */}
        <div>
          {/* Status panel */}
          <div className="form-section">
            <div className="form-section-title">Estado del Vehículo</div>

            {/* CLIENTS: status info + key details */}
            {!canManage && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {vehicle.status === 'available' && (
                  <>
                    <div style={{
                      background: 'rgba(61,232,138,0.07)', border: '1px solid rgba(61,232,138,0.25)',
                      borderRadius: 10, padding: '12px 16px',
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--success)', marginBottom: 4 }}>
                        ✅ Disponible
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        Este vehículo está disponible. Podés agendar un test drive usando el formulario de abajo.
                      </div>
                    </div>
                    <div className="info-list" style={{ gridTemplateColumns: '1fr' }}>
                      <div className="info-item">
                        <div className="label">Precio</div>
                        <div className="value" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                          {vehicle.price_min && vehicle.price_max
                            ? `${formatCurrency(vehicle.price_min)} – ${formatCurrency(vehicle.price_max)}`
                            : vehicle.price_min ? `desde ${formatCurrency(vehicle.price_min)}`
                            : vehicle.price_max ? `hasta ${formatCurrency(vehicle.price_max)}`
                            : 'A consultar'}
                        </div>
                      </div>
                      <div className="info-item">
                        <div className="label">Ingresado</div>
                        <div className="value">{formatDate(vehicle.created_at)}</div>
                      </div>
                    </div>
                  </>
                )}
                {vehicle.status === 'sold' && (
                  <div style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '14px 16px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>🏁</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>
                      Vehículo vendido
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      Este vehículo ya fue adquirido por otro cliente.
                    </div>
                  </div>
                )}
                {vehicle.status === 'withdrawn' && (
                  <div style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '14px 16px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>⛔</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>
                      No disponible
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      Este vehículo fue retirado del stock.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MANAGERS: full status controls */}
            {canManage && vehicle.status === 'available' && (
              <div>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Este vehículo está disponible para la venta.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button className="btn btn-success" onClick={() => { setShowSellModal(true); setError('') }}>
                    Marcar como Vendido
                  </button>
                  <button className="btn btn-warning" onClick={() => { setShowWithdrawModal(true); setError('') }}>
                    Retirar del Stock
                  </button>
                </div>
              </div>
            )}

            {canManage && vehicle.status === 'sold' && (
              <div>
                <div className="alert alert-success" style={{ marginBottom: 16 }}>Vehículo vendido</div>
                <div className="info-list" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="info-item">
                    <div className="label">Vendedor</div>
                    <div className="value">
                      {vehicle.seller_id ? (
                        <Link to={`/sellers/${vehicle.seller_id}`} style={{ color: 'var(--accent)' }}>
                          {vehicle.seller_name || `Vendedor #${vehicle.seller_id}`}
                        </Link>
                      ) : '-'}
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="label">Precio de Venta</div>
                    <div className="value" style={{ color: 'var(--success)', fontWeight: 800 }}>
                      {vehicle.sale_price ? formatCurrency(vehicle.sale_price) : '-'}
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="label">Fecha de Venta</div>
                    <div className="value">{formatDate(vehicle.sold_at)}</div>
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 16 }} onClick={handleMakeAvailable}>
                  Volver a Disponible
                </button>
              </div>
            )}

            {canManage && vehicle.status === 'withdrawn' && (
              <div>
                <div className="alert alert-warning" style={{ marginBottom: 16 }}>Vehículo retirado del stock</div>
                <div className="info-item">
                  <div className="label">Motivo</div>
                  <div className="value" style={{ fontWeight: 400, marginTop: 4 }}>{vehicle.withdrawal_reason || '-'}</div>
                </div>
                <div className="info-item" style={{ marginTop: 12 }}>
                  <div className="label">Fecha de Retiro</div>
                  <div className="value">{formatDate(vehicle.withdrawn_at)}</div>
                </div>
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 16 }} onClick={handleMakeAvailable}>
                  Volver a Disponible
                </button>
              </div>
            )}
          </div>

          {/* Financing calculator — visible to everyone */}
          <FinancingCalc priceMin={vehicle.price_min} priceMax={vehicle.price_max} />

          {/* Edit panel — managers only */}
          {canManage && (
            <EditPanel vehicle={vehicle} onSave={updated => setVehicle(prev => ({ ...prev, ...updated }))} />
          )}

          {/* Internal notes — managers only */}
          {canManage && (
            <InternalNotesPanel vehicle={vehicle} onSave={updated => setVehicle(prev => ({ ...prev, ...updated }))} />
          )}

          {/* Price history — managers only */}
          {canManage && priceHistory.length > 0 && (
            <div className="form-section">
              <div className="form-section-title">Historial de Precios</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Fecha', 'P.Min anterior', 'P.Min nuevo', 'P.Max anterior', 'P.Max nuevo'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {priceHistory.map(row => (
                      <tr key={row.id}>
                        <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>{formatDateTime(row.changed_at)}</td>
                        <td style={{ padding: '6px 8px', color: 'var(--text-soft)' }}>{row.old_price_min ? formatCurrency(row.old_price_min) : '-'}</td>
                        <td style={{ padding: '6px 8px', color: 'var(--accent)' }}>{row.new_price_min ? formatCurrency(row.new_price_min) : '-'}</td>
                        <td style={{ padding: '6px 8px', color: 'var(--text-soft)' }}>{row.old_price_max ? formatCurrency(row.old_price_max) : '-'}</td>
                        <td style={{ padding: '6px 8px', color: 'var(--accent)' }}>{row.new_price_max ? formatCurrency(row.new_price_max) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && photos.length > 0 && (
        <div
          onClick={() => setLightboxOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxOpen(false)}
            style={{
              position: 'absolute', top: 20, right: 20,
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '50%', width: 40, height: 40,
              color: '#fff', fontSize: 20, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10000,
            }}
          >
            ✕
          </button>

          {/* Image */}
          <img
            src={getPhotoSrc(photos[lightboxIndex])}
            alt={`Foto ${lightboxIndex + 1}`}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '90vw', maxHeight: '85vh',
              objectFit: 'contain', borderRadius: 8,
              boxShadow: '0 10px 60px rgba(0,0,0,0.8)',
            }}
          />

          {/* Prev arrow */}
          {photos.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i - 1 + photos.length) % photos.length) }}
              style={{
                position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '50%', width: 44, height: 44,
                color: '#fff', fontSize: 20, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ‹
            </button>
          )}

          {/* Next arrow */}
          {photos.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i + 1) % photos.length) }}
              style={{
                position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '50%', width: 44, height: 44,
                color: '#fff', fontSize: 20, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ›
            </button>
          )}

          {/* Counter */}
          <div style={{
            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            color: 'rgba(255,255,255,0.5)', fontSize: 13,
          }}>
            {lightboxIndex + 1} / {photos.length}
          </div>
        </div>
      )}

      {/* Sell Modal */}
      {showSellModal && (
        <div className="modal-overlay" onClick={() => setShowSellModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Registrar Venta</div>
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Vendedor *</label>
              <select value={sellForm.seller_id} onChange={e => setSellForm(p => ({ ...p, seller_id: e.target.value }))}>
                <option value="">Seleccioná un vendedor</option>
                {sellers.filter(s => s.active).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Precio de Venta (ARS) *</label>
              <input
                type="number" placeholder="Ej: 15000000" value={sellForm.sale_price}
                onChange={e => setSellForm(p => ({ ...p, sale_price: e.target.value }))}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowSellModal(false)}>Cancelar</button>
              <button className="btn btn-success" onClick={handleSell} disabled={submitting}>
                {submitting ? 'Guardando...' : 'Confirmar Venta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="modal-overlay" onClick={() => setShowWithdrawModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Retirar del Stock</div>
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="form-group">
              <label>Motivo de Retiro *</label>
              <textarea
                placeholder="Ej: Vehículo devuelto, mal estado, etc."
                value={withdrawForm.withdrawal_reason}
                onChange={e => setWithdrawForm({ withdrawal_reason: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowWithdrawModal(false)}>Cancelar</button>
              <button className="btn btn-warning" onClick={handleWithdraw} disabled={submitting}>
                {submitting ? 'Guardando...' : 'Confirmar Retiro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EditPanel({ vehicle, onSave }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    brand: vehicle.brand, model: vehicle.model, year: vehicle.year, km: vehicle.km,
    color: vehicle.color || '', description: vehicle.description || '',
    price_min: vehicle.price_min || '', price_max: vehicle.price_max || '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const handleSave = async () => {
    setSaving(true); setErr('')
    try {
      const { updateVehicle } = await import('../api')
      const res = await updateVehicle(vehicle.id, form)
      onSave(res.data)
      setOpen(false)
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  if (!open) {
    return (
      <div className="form-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Editar Información</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setOpen(true)}>Editar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="form-section">
      <div className="form-section-title">Editar Información Básica</div>
      {err && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{err}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="form-group">
            <label>Marca</label>
            <input value={form.brand} onChange={e => setForm(p => ({ ...p, brand: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Modelo</label>
            <input value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Año</label>
            <input type="number" value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Kilometraje</label>
            <input type="number" value={form.km} onChange={e => setForm(p => ({ ...p, km: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Precio Mínimo</label>
            <input type="number" value={form.price_min} onChange={e => setForm(p => ({ ...p, price_min: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Precio Máximo</label>
            <input type="number" value={form.price_max} onChange={e => setForm(p => ({ ...p, price_max: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Color</label>
            <input value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} />
          </div>
        </div>
        <div className="form-group">
          <label>Descripción</label>
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setOpen(false)}>Cancelar</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

function InternalNotesPanel({ vehicle, onSave }) {
  const [notes, setNotes] = useState(vehicle.notes_internal || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')

  const handleSave = async () => {
    setSaving(true); setErr(''); setSaved(false)
    try {
      const { updateVehicle } = await import('../api')
      const res = await updateVehicle(vehicle.id, { notes_internal: notes })
      onSave(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="form-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="form-section-title" style={{ marginBottom: 0 }}>Notas Internas</div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
          background: 'rgba(168,127,245,0.12)', color: '#a87ff5',
          border: '1px solid rgba(168,127,245,0.2)',
        }}>
          🔒 Solo visible para el equipo
        </span>
      </div>
      {err && <div className="alert alert-danger" style={{ marginBottom: 10 }}>{err}</div>}
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Notas internas sobre este vehículo..."
        style={{ minHeight: 100, width: '100%', marginBottom: 10 }}
      />
      <button
        className={`btn btn-sm ${saved ? 'btn-success' : 'btn-primary'}`}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar notas'}
      </button>
    </div>
  )
}
