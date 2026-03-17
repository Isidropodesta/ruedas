import { useState, useEffect } from 'react'
import { getVehicles, getVehicle } from '../api'

function formatCurrency(n) {
  const num = parseFloat(n) || 0
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(num)
}

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

export default function Compare() {
  const [allVehicles, setAllVehicles] = useState([])
  const [selected, setSelected] = useState([null, null, null])
  const [details, setDetails] = useState([null, null, null])
  const [loadingIdx, setLoadingIdx] = useState([false, false, false])

  useEffect(() => {
    getVehicles().then(res => setAllVehicles(res.data || [])).catch(console.error)
  }, [])

  const handleSelect = async (slotIdx, vehicleId) => {
    const newSelected = [...selected]
    const newDetails = [...details]
    const newLoading = [...loadingIdx]

    if (!vehicleId) {
      newSelected[slotIdx] = null
      newDetails[slotIdx] = null
      setSelected(newSelected)
      setDetails(newDetails)
      return
    }

    newSelected[slotIdx] = vehicleId
    setSelected(newSelected)
    newLoading[slotIdx] = true
    setLoadingIdx(newLoading)

    try {
      const res = await getVehicle(vehicleId)
      newDetails[slotIdx] = res.data
      setDetails([...newDetails])
    } catch (err) {
      console.error(err)
    } finally {
      const l = [...loadingIdx]
      l[slotIdx] = false
      setLoadingIdx(l)
    }
  }

  const handleClear = () => {
    setSelected([null, null, null])
    setDetails([null, null, null])
  }

  const activeVehicles = details.filter(Boolean)

  // Collect all feature keys across selected vehicles
  const allFeatureKeys = [...new Set(
    activeVehicles.flatMap(v => Object.keys(v.features || {}))
  )]

  // Determine best km (lowest) and best price_max (highest) indices
  const kms = activeVehicles.map(v => parseInt(v.km) || 0)
  const prices = activeVehicles.map(v => parseFloat(v.price_max) || 0)
  const minKm = Math.min(...kms.filter(k => k > 0))
  const maxPrice = Math.max(...prices.filter(p => p > 0))

  const rows = [
    { label: 'Marca',       get: v => v.brand },
    { label: 'Modelo',      get: v => v.model },
    { label: 'Año',         get: v => v.year },
    { label: 'KM',          get: v => parseInt(v.km || 0).toLocaleString('es-AR') + ' km',
      highlight: (v, _all) => parseInt(v.km || 0) === minKm && minKm > 0 ? 'best' : null },
    { label: 'Precio Mín',  get: v => v.price_min ? formatCurrency(v.price_min) : '-' },
    { label: 'Precio Máx',  get: v => v.price_max ? formatCurrency(v.price_max) : '-',
      highlight: (v, _all) => parseFloat(v.price_max) === maxPrice && maxPrice > 0 ? 'worst' : null },
    { label: 'Tipo',        get: v => typeLabels[v.type] || v.type },
    { label: 'Color',       get: v => v.color || '-' },
    { label: 'Estado',      get: v => statusLabels[v.status] || v.status },
    ...allFeatureKeys.map(k => ({
      label: featureLabels[k] || k,
      get: v => {
        const val = (v.features || {})[k]
        if (val === undefined || val === null || val === '') return '-'
        if (typeof val === 'boolean') return val ? 'Sí' : 'No'
        return String(val)
      },
    })),
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Comparador de Vehículos</h2>
          <p>Seleccioná hasta 3 vehículos para comparar lado a lado</p>
        </div>
        {activeVehicles.length > 0 && (
          <button className="btn btn-secondary" onClick={handleClear}>
            Limpiar
          </button>
        )}
      </div>

      {/* Selectors */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {[0, 1, 2].map(i => (
          <div key={i} className="form-section" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>
              Vehículo {i + 1}
            </div>
            <select
              value={selected[i] || ''}
              onChange={e => handleSelect(i, e.target.value || null)}
            >
              <option value="">-- Seleccionar --</option>
              {allVehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.brand} {v.model} {v.year} — {parseInt(v.km || 0).toLocaleString('es-AR')} km
                </option>
              ))}
            </select>
            {loadingIdx[i] && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Cargando...</div>}
            {details[i] && !loadingIdx[i] && (
              <div style={{ marginTop: 12 }}>
                {details[i].photos && details[i].photos.length > 0 ? (
                  <img
                    src={details[i].photos[0].url || details[i].photos[0]}
                    alt={details[i].brand}
                    style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }}
                  />
                ) : (
                  <div style={{
                    width: '100%', height: 120, borderRadius: 8, background: 'var(--bg-card-hover)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, marginBottom: 8,
                  }}>🚗</div>
                )}
                <div style={{ fontWeight: 700, fontSize: 14 }}>{details[i].brand} {details[i].model}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{details[i].year}</div>
                {details[i].price_min && (
                  <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700, marginTop: 4 }}>
                    {formatCurrency(details[i].price_min)} – {details[i].price_max ? formatCurrency(details[i].price_max) : '?'}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Comparison Table */}
      {activeVehicles.length >= 2 && (
        <div className="compare-table-wrapper">
          <table className="compare-table">
            <thead>
              <tr>
                <th style={{ width: 160 }}>Característica</th>
                {[0, 1, 2].map(i => details[i] ? (
                  <th key={i} className="compare-header">
                    {details[i].photos && details[i].photos.length > 0 ? (
                      <img
                        src={details[i].photos[0].url || details[i].photos[0]}
                        alt={details[i].brand}
                        style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 6, marginBottom: 6, display: 'block', margin: '0 auto 6px' }}
                      />
                    ) : (
                      <div style={{ fontSize: 24, marginBottom: 6 }}>🚗</div>
                    )}
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{details[i].brand} {details[i].model}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>{details[i].year}</div>
                  </th>
                ) : null)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => {
                const values = details.filter(Boolean).map(v => row.get(v))
                const highlights = row.highlight
                  ? details.filter(Boolean).map(v => row.highlight(v, details.filter(Boolean)))
                  : details.filter(Boolean).map(() => null)

                return (
                  <tr key={rowIdx}>
                    <td style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {row.label}
                    </td>
                    {details.filter(Boolean).map((v, vi) => (
                      <td
                        key={vi}
                        className={highlights[vi] === 'best' ? 'compare-cell-best' : highlights[vi] === 'worst' ? 'compare-cell-worst' : ''}
                        style={{ fontSize: 14, fontWeight: 500 }}
                      >
                        {row.get(v)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeVehicles.length === 1 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
          Seleccioná al menos un vehículo más para comparar.
        </div>
      )}

      {activeVehicles.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">⚖️</span>
          <h3>Ningún vehículo seleccionado</h3>
          <p>Seleccioná 2 o 3 vehículos de los selectores de arriba para ver la comparación.</p>
        </div>
      )}
    </div>
  )
}
