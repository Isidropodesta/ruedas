import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createSeller } from '../api'

export default function AddSeller() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    hire_date: '',
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => ({ ...p, [k]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'El nombre es requerido.'
    if (form.email && !/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) {
      errs.email = 'Email inválido.'
    }
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setSubmitting(true)
    try {
      const res = await createSeller({
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        hire_date: form.hire_date || undefined,
      })
      navigate(`/sellers/${res.data.id}`)
    } catch (err) {
      alert('Error al crear el vendedor: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <Link to="/sellers" className="back-link">← Volver a Vendedores</Link>

      <div className="page-header">
        <div>
          <h2>Agregar Vendedor</h2>
          <p>Registrá un nuevo vendedor en el sistema</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <div className="form-section-title">Datos del Vendedor</div>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="form-group">
              <label>Nombre Completo *</label>
              <input
                value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="Ej: Juan Pérez"
              />
              {errors.name && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{errors.name}</span>}
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="Ej: juan@ruedas.com"
              />
              {errors.email && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{errors.email}</span>}
            </div>

            <div className="form-group">
              <label>Teléfono</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => handleChange('phone', e.target.value)}
                placeholder="Ej: +54 11 1234-5678"
              />
            </div>

            <div className="form-group">
              <label>Fecha de Ingreso</label>
              <input
                type="date"
                value={form.hire_date}
                onChange={e => handleChange('hire_date', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Link to="/sellers" className="btn btn-secondary">Cancelar</Link>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Guardando...' : 'Crear Vendedor'}
          </button>
        </div>
      </form>
    </div>
  )
}
