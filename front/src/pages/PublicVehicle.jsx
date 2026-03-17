import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getPublicVehicle } from '../api'

const typeLabels = { utility: 'Utilitario', road: 'Ruta', luxury: 'Lujo' }
const statusLabels = { available: 'Disponible', sold: 'Vendido', withdrawn: 'Retirado' }

const featureLabels = {
  traccion: 'Tracción',
  combustible: 'Combustible',
  puertas: 'Puertas',
  capacidad_carga_kg: 'Cap. Carga (kg)',
  payload_kg: 'Payload (kg)',
  aire_acondicionado: 'Aire Acond.',
  transmision: 'Transmisión',
  consumo_l100km: 'Consumo (L/100km)',
  autonomia_km: 'Autonomía (km)',
  baul_litros: 'Baúl (L)',
  bluetooth: 'Bluetooth',
  camara_reversa: 'Cámara Reversa',
  asientos_cuero: 'Asientos Cuero',
  techo_solar: 'Techo Solar',
  audio_premium: 'Audio Premium',
  cruise_adaptativo: 'Cruise Adaptativo',
  punto_ciego: 'Punto Ciego',
  sensores_estacionamiento: 'Sensores Estacionamiento',
  camara_360: 'Cámara 360°',
  asientos: 'Asientos',
}

const COMPONENT_LABELS = {
  motor: 'Motor',
  transmision: 'Transmisión',
  frenos_del: 'Frenos Delanteros',
  frenos_tras: 'Frenos Traseros',
  suspension_del: 'Suspensión Delantera',
  suspension_tras: 'Suspensión Trasera',
  direccion: 'Dirección',
  neumaticos: 'Neumáticos',
  carroceria: 'Carrocería',
  pintura: 'Pintura',
  vidrios: 'Vidrios',
  interior: 'Interior',
  tapizado: 'Tapizado',
  aire_acondicionado: 'Aire Acondicionado',
  sistema_electrico: 'Sistema Eléctrico',
  bateria: 'Batería',
  luces: 'Luces',
}

const ESTADO_STYLES = {
  excelente: { color: '#3de88a', bg: 'rgba(61,232,138,0.15)', label: 'Excelente' },
  bueno: { color: '#4a90e8', bg: 'rgba(74,144,232,0.15)', label: 'Bueno' },
  regular: { color: '#e8c840', bg: 'rgba(232,200,64,0.15)', label: 'Regular' },
  necesita_atencion: { color: '#e85040', bg: 'rgba(232,80,64,0.15)', label: 'Necesita Atención' },
  'n/a': { color: '#8b8990', bg: 'rgba(139,137,144,0.15)', label: 'N/A' },
}

function formatCurrency(n) {
  const num = parseFloat(n) || 0
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(num)
}

const WHATSAPP_PHONE = '5491100000000'

export default function PublicVehicle() {
  const { id } = useParams()
  const [vehicle, setVehicle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activePhoto, setActivePhoto] = useState(0)
  const [copied, setCopied] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    getPublicVehicle(id)
      .then(res => {
        if (res.success && res.data) {
          setVehicle(res.data)
        } else {
          setNotFound(true)
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  const handleShare = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      prompt('Copiá este enlace:', url)
    })
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0d0d12', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, -apple-system, sans-serif',
        color: '#f0eeeb',
      }}>
        Cargando vehículo...
      </div>
    )
  }

  if (notFound || !vehicle) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0d0d12', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, -apple-system, sans-serif',
        color: '#f0eeeb', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ fontSize: 64 }}>🚗</div>
        <h2 style={{ fontSize: 24, fontWeight: 700 }}>Vehículo no encontrado</h2>
        <p style={{ color: '#8b8990' }}>Este vehículo no está disponible o fue removido.</p>
      </div>
    )
  }

  const photos = vehicle.photos || []
  const features = vehicle.features || {}
  const report = vehicle.component_report || {}
  const hasReport = Object.keys(report).length > 0

  const whatsappMsg = encodeURIComponent(
    `Hola! Me interesa este vehículo: ${vehicle.brand} ${vehicle.model} ${vehicle.year}. ¿Podría darme más información?`
  )
  const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${whatsappMsg}`

  return (
    <div className="public-page">
      {/* Header */}
      <header className="public-header">
        <div className="public-header-inner">
          <div className="public-brand">
            <span style={{ fontSize: 22, marginRight: 8 }}>🚗</span>
            <span style={{ fontFamily: 'Georgia, serif', fontWeight: 900, letterSpacing: 4, fontSize: 18 }}>RUEDAS</span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 4, textTransform: 'uppercase', marginLeft: 8, alignSelf: 'flex-end', marginBottom: 2 }}>CONCESIONARIA</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="public-share-btn" onClick={handleShare}>
              {copied ? 'Copiado!' : 'Compartir'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="public-hero">
        {photos.length > 0 ? (
          <>
            <img
              src={photos[activePhoto]?.url || photos[activePhoto]}
              alt={`${vehicle.brand} ${vehicle.model}`}
              className="public-hero-img"
            />
            {photos.length > 1 && (
              <div className="public-hero-thumbs">
                {photos.map((p, i) => (
                  <img
                    key={i}
                    src={p.url || p}
                    alt={`foto ${i + 1}`}
                    className={`public-hero-thumb${i === activePhoto ? ' active' : ''}`}
                    onClick={() => setActivePhoto(i)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="public-hero-placeholder">🚗</div>
        )}
        <div className="public-hero-overlay">
          <div className="public-hero-content">
            <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{
                background: vehicle.status === 'available' ? 'rgba(61,232,138,0.2)' : 'rgba(139,137,144,0.2)',
                color: vehicle.status === 'available' ? '#3de88a' : '#8b8990',
                border: `1px solid ${vehicle.status === 'available' ? 'rgba(61,232,138,0.4)' : 'rgba(139,137,144,0.3)'}`,
                padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
              }}>
                {statusLabels[vehicle.status] || vehicle.status}
              </span>
              <span style={{
                background: 'rgba(232,160,64,0.2)', color: '#e8a040',
                border: '1px solid rgba(232,160,64,0.4)',
                padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
              }}>
                {typeLabels[vehicle.type] || vehicle.type}
              </span>
            </div>
            <h1 className="public-hero-title">
              {vehicle.brand} {vehicle.model}
            </h1>
            <div className="public-hero-year">{vehicle.year}</div>
            {(vehicle.price_min || vehicle.price_max) && (
              <div className="public-hero-price">
                {vehicle.price_min && vehicle.price_max
                  ? `${formatCurrency(vehicle.price_min)} – ${formatCurrency(vehicle.price_max)}`
                  : vehicle.price_min
                    ? `Desde ${formatCurrency(vehicle.price_min)}`
                    : `Hasta ${formatCurrency(vehicle.price_max)}`
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="public-content">

        {/* Info Grid */}
        <div className="public-section">
          <h2 className="public-section-title">Información del Vehículo</h2>
          <div className="public-info-grid">
            {[
              { label: 'Marca', value: vehicle.brand },
              { label: 'Modelo', value: vehicle.model },
              { label: 'Año', value: vehicle.year },
              { label: 'Kilometraje', value: `${parseInt(vehicle.km || 0).toLocaleString('es-AR')} km` },
              { label: 'Color', value: vehicle.color || '-' },
              { label: 'Tipo', value: typeLabels[vehicle.type] || '-' },
              vehicle.price_min && { label: 'Precio Mínimo', value: formatCurrency(vehicle.price_min), accent: true },
              vehicle.price_max && { label: 'Precio Máximo', value: formatCurrency(vehicle.price_max), accent: true },
            ].filter(Boolean).map((item, i) => (
              <div key={i} className="public-info-item">
                <div className="public-info-label">{item.label}</div>
                <div className="public-info-value" style={item.accent ? { color: '#e8a040', fontWeight: 700 } : {}}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
          {vehicle.description && (
            <p style={{ marginTop: 20, fontSize: 14, color: '#8b8990', lineHeight: 1.7 }}>
              {vehicle.description}
            </p>
          )}
        </div>

        {/* Features */}
        {Object.keys(features).length > 0 && (
          <div className="public-section">
            <h2 className="public-section-title">Características</h2>
            <div className="public-features">
              {Object.entries(features).map(([k, v]) => {
                if (v === undefined || v === null || v === '') return null
                return (
                  <div key={k} className={`public-feature-tag${typeof v === 'boolean' && v ? ' yes' : ''}`}>
                    {typeof v === 'boolean' ? (v ? '✓' : '✗') : null}
                    {' '}{featureLabels[k] || k}{typeof v !== 'boolean' ? `: ${v}` : ''}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Component Report */}
        {hasReport && (
          <div className="public-section">
            <h2 className="public-section-title">Informe de Componentes</h2>
            <div className="public-report-grid">
              {Object.entries(COMPONENT_LABELS).map(([key, label]) => {
                const comp = report[key]
                if (!comp || !comp.estado) return null
                const estilo = ESTADO_STYLES[comp.estado] || ESTADO_STYLES['bueno']
                return (
                  <div key={key} className="public-report-row">
                    <span className="public-report-label">{label}</span>
                    <span className="public-report-badge" style={{
                      background: estilo.bg, color: estilo.color,
                      border: `1px solid ${estilo.color}44`,
                    }}>
                      {estilo.label}
                    </span>
                    {comp.obs && <span className="public-report-obs">{comp.obs}</span>}
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13 }}>
              {report.km_verificado !== undefined && (
                <span style={{ color: report.km_verificado ? '#3de88a' : '#e85040', fontWeight: 600 }}>
                  KM: {report.km_verificado ? 'Verificado' : 'No verificado'}
                </span>
              )}
              {report.inspeccionado_por && (
                <span style={{ color: '#8b8990' }}>Inspector: <strong style={{ color: '#f0eeeb' }}>{report.inspeccionado_por}</strong></span>
              )}
              {report.fecha_inspeccion && (
                <span style={{ color: '#8b8990' }}>
                  Inspeccionado: <strong style={{ color: '#f0eeeb' }}>
                    {new Date(report.fecha_inspeccion + 'T00:00:00').toLocaleDateString('es-AR')}
                  </strong>
                </span>
              )}
            </div>
            {report.observaciones_generales && (
              <p style={{ marginTop: 12, fontSize: 13, color: '#8b8990', lineHeight: 1.6, fontStyle: 'italic' }}>
                {report.observaciones_generales}
              </p>
            )}
          </div>
        )}

        {/* CTA */}
        {vehicle.status === 'available' && (
          <div className="public-cta-section">
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
              ¿Te interesa este vehículo?
            </h2>
            <p style={{ color: '#8b8990', marginBottom: 24, fontSize: 14 }}>
              Contactanos por WhatsApp y te respondemos a la brevedad.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="public-cta"
              >
                Consultar por WhatsApp
              </a>
              <button className="public-share-btn public-share-btn-lg" onClick={handleShare}>
                {copied ? 'Enlace copiado!' : 'Compartir esta ficha'}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <footer className="public-footer">
        <span style={{ fontFamily: 'Georgia, serif', fontWeight: 900, letterSpacing: 4 }}>RUEDAS</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 3, textTransform: 'uppercase', marginLeft: 10 }}>CONCESIONARIA</span>
      </footer>
    </div>
  )
}
