import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createVehicle } from '../api'

const FEATURES_BY_TYPE = {
  utility: [
    { key: 'traccion', label: 'Tracción', type: 'select', options: ['4x4', '4x2', '4x4i'] },
    { key: 'combustible', label: 'Combustible', type: 'select', options: ['nafta', 'diesel', 'GNC', 'hibrido', 'electrico'] },
    { key: 'puertas', label: 'Puertas', type: 'select', options: ['2', '3', '4', '5'] },
    { key: 'capacidad_carga_kg', label: 'Capacidad de Carga (kg)', type: 'number' },
    { key: 'payload_kg', label: 'Payload (kg)', type: 'number' },
    { key: 'aire_acondicionado', label: 'Aire Acondicionado', type: 'bool' },
  ],
  road: [
    { key: 'combustible', label: 'Combustible', type: 'select', options: ['nafta', 'diesel', 'GNC', 'hibrido', 'electrico'] },
    { key: 'puertas', label: 'Puertas', type: 'select', options: ['2', '3', '4', '5'] },
    { key: 'transmision', label: 'Transmisión', type: 'select', options: ['manual', 'automatica'] },
    { key: 'consumo_l100km', label: 'Consumo (L/100km)', type: 'number' },
    { key: 'autonomia_km', label: 'Autonomía (km)', type: 'number' },
    { key: 'baul_litros', label: 'Baúl (litros)', type: 'number' },
    { key: 'aire_acondicionado', label: 'Aire Acondicionado', type: 'bool' },
    { key: 'bluetooth', label: 'Bluetooth', type: 'bool' },
    { key: 'camara_reversa', label: 'Cámara de Reversa', type: 'bool' },
  ],
  luxury: [
    { key: 'combustible', label: 'Combustible', type: 'select', options: ['nafta', 'diesel', 'GNC', 'hibrido', 'electrico'] },
    { key: 'puertas', label: 'Puertas', type: 'select', options: ['2', '3', '4', '5'] },
    { key: 'transmision', label: 'Transmisión', type: 'select', options: ['manual', 'automatica'] },
    { key: 'asientos', label: 'Asientos', type: 'number' },
    { key: 'consumo_l100km', label: 'Consumo (L/100km)', type: 'number' },
    { key: 'asientos_cuero', label: 'Asientos de Cuero', type: 'bool' },
    { key: 'techo_solar', label: 'Techo Solar', type: 'bool' },
    { key: 'audio_premium', label: 'Audio Premium', type: 'bool' },
    { key: 'cruise_adaptativo', label: 'Cruise Adaptativo', type: 'bool' },
    { key: 'punto_ciego', label: 'Punto Ciego', type: 'bool' },
    { key: 'sensores_estacionamiento', label: 'Sensores de Estacionamiento', type: 'bool' },
    { key: 'camara_360', label: 'Cámara 360°', type: 'bool' },
  ],
}

export default function AddVehicle() {
  const navigate = useNavigate()
  const fileRef = useRef()

  const [form, setForm] = useState({
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    km: 0,
    color: '',
    description: '',
    price_min: '',
    price_max: '',
    type: '',
  })
  const [features, setFeatures] = useState({})
  const [photos, setPhotos] = useState([])
  const [photoPreviews, setPhotoPreviews] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  const handleChange = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => ({ ...p, [k]: '' }))
  }

  const handleTypeChange = (t) => {
    setForm(p => ({ ...p, type: t }))
    setFeatures({})
    if (errors.type) setErrors(p => ({ ...p, type: '' }))
  }

  const handleFeatureChange = (k, v) => {
    setFeatures(p => ({ ...p, [k]: v }))
  }

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files)
    setPhotos(files)
    setPhotoPreviews(files.map(f => URL.createObjectURL(f)))
  }

  const validate = () => {
    const errs = {}
    if (!form.brand.trim()) errs.brand = 'La marca es requerida.'
    if (!form.model.trim()) errs.model = 'El modelo es requerido.'
    if (!form.year || form.year < 1900 || form.year > new Date().getFullYear() + 2) errs.year = 'Año inválido.'
    if (!form.type) errs.type = 'Seleccioná un tipo.'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('brand', form.brand)
      fd.append('model', form.model)
      fd.append('year', form.year)
      fd.append('km', form.km || 0)
      fd.append('color', form.color)
      fd.append('description', form.description)
      if (form.price_min) fd.append('price_min', form.price_min)
      if (form.price_max) fd.append('price_max', form.price_max)
      fd.append('type', form.type)
      fd.append('features', JSON.stringify(features))
      photos.forEach(f => fd.append('photos', f))

      const res = await createVehicle(fd)
      navigate(`/vehicles/${res.data.id}`)
    } catch (err) {
      alert('Error al crear el vehículo: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const selectedTypeFeatures = FEATURES_BY_TYPE[form.type] || []
  const boolFeatures = selectedTypeFeatures.filter(f => f.type === 'bool')
  const otherFeatures = selectedTypeFeatures.filter(f => f.type !== 'bool')

  return (
    <div style={{ maxWidth: 860 }}>
      <Link to="/vehicles" className="back-link">← Volver a Vehículos</Link>

      <div className="page-header">
        <div>
          <h2>Agregar Vehículo</h2>
          <p>Completá el formulario para registrar un nuevo vehículo</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Info */}
        <div className="form-section">
          <div className="form-section-title">Información Básica</div>
          <div className="form-grid">
            <div className="form-group">
              <label>Marca *</label>
              <input
                value={form.brand}
                onChange={e => handleChange('brand', e.target.value)}
                placeholder="Ej: Toyota"
              />
              {errors.brand && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{errors.brand}</span>}
            </div>
            <div className="form-group">
              <label>Modelo *</label>
              <input
                value={form.model}
                onChange={e => handleChange('model', e.target.value)}
                placeholder="Ej: Hilux"
              />
              {errors.model && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{errors.model}</span>}
            </div>
            <div className="form-group">
              <label>Año *</label>
              <input
                type="number"
                value={form.year}
                onChange={e => handleChange('year', parseInt(e.target.value))}
                min="1900"
                max={new Date().getFullYear() + 2}
              />
              {errors.year && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{errors.year}</span>}
            </div>
            <div className="form-group">
              <label>Kilometraje</label>
              <input
                type="number"
                value={form.km}
                onChange={e => handleChange('km', e.target.value)}
                min="0"
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label>Color</label>
              <input
                value={form.color}
                onChange={e => handleChange('color', e.target.value)}
                placeholder="Ej: Blanco Perlado"
              />
            </div>
            <div className="form-group">
              <label>Precio Mínimo (ARS)</label>
              <input
                type="number"
                value={form.price_min}
                onChange={e => handleChange('price_min', e.target.value)}
                placeholder="Ej: 12000000"
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Precio Máximo (ARS)</label>
              <input
                type="number"
                value={form.price_max}
                onChange={e => handleChange('price_max', e.target.value)}
                placeholder="Ej: 15000000"
                min="0"
              />
            </div>
            <div className="form-group full">
              <label>Descripción</label>
              <textarea
                value={form.description}
                onChange={e => handleChange('description', e.target.value)}
                placeholder="Descripción del vehículo, estado, extras, etc."
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Type selector */}
        <div className="form-section">
          <div className="form-section-title">Tipo de Vehículo *</div>
          {errors.type && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{errors.type}</div>}
          <div className="type-selector">
            {[
              { id: 'utility', icon: '🚚', label: 'Utilitario' },
              { id: 'road', icon: '🚗', label: 'Ruta' },
              { id: 'luxury', icon: '🏎️', label: 'Lujo' },
            ].map(t => (
              <div
                key={t.id}
                className={`type-option${form.type === t.id ? ' selected' : ''}`}
                onClick={() => handleTypeChange(t.id)}
              >
                <div className="type-icon">{t.icon}</div>
                <div className="type-name">{t.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        {form.type && (
          <div className="form-section">
            <div className="form-section-title">Características — {form.type === 'utility' ? 'Utilitario' : form.type === 'road' ? 'Ruta' : 'Lujo'}</div>
            {otherFeatures.length > 0 && (
              <div className="form-grid" style={{ marginBottom: 16 }}>
                {otherFeatures.map(f => (
                  <div key={f.key} className="form-group">
                    <label>{f.label}</label>
                    {f.type === 'select' ? (
                      <select
                        value={features[f.key] || ''}
                        onChange={e => handleFeatureChange(f.key, e.target.value)}
                      >
                        <option value="">Seleccionar...</option>
                        {f.options.map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        value={features[f.key] || ''}
                        onChange={e => handleFeatureChange(f.key, e.target.value ? parseFloat(e.target.value) : '')}
                        placeholder="—"
                        min="0"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            {boolFeatures.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
                {boolFeatures.map(f => (
                  <div key={f.key} className="checkbox-group">
                    <input
                      type="checkbox"
                      id={f.key}
                      checked={features[f.key] || false}
                      onChange={e => handleFeatureChange(f.key, e.target.checked)}
                    />
                    <label htmlFor={f.key}>{f.label}</label>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Photos */}
        <div className="form-section">
          <div className="form-section-title">Fotos del Vehículo</div>
          <div className="photo-upload-area" onClick={() => fileRef.current?.click()}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoChange}
            />
            <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>Hacé clic para seleccionar fotos</p>
            <p style={{ fontSize: 12 }}>Podés subir múltiples imágenes (JPG, PNG, WEBP)</p>
          </div>
          {photoPreviews.length > 0 && (
            <div className="photo-preview-list">
              {photoPreviews.map((src, i) => (
                <img key={i} className="photo-preview-item" src={src} alt={`preview ${i}`} />
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Link to="/vehicles" className="btn btn-secondary">Cancelar</Link>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Guardando...' : 'Crear Vehículo'}
          </button>
        </div>
      </form>
    </div>
  )
}
