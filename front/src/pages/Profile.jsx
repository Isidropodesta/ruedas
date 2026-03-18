import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

async function updateProfile(data) {
  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${BASE}/auth/profile`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    throw new Error(json.error || `Error ${res.status}`)
  }
  return json
}

const ROLE_LABELS = {
  dueno: 'Dueño',
  vendedor: 'Vendedor',
  cliente: 'Cliente',
}

const ROLE_COLORS = {
  dueno: '#e8c840',
  vendedor: '#a87ff5',
  cliente: '#4ae8d0',
}

export default function Profile() {
  const { user, login: setUser } = useAuth()

  const [infoForm, setInfoForm] = useState({ name: user?.name || '' })
  const [passForm, setPassForm] = useState({ current_password: '', new_password: '', confirm: '' })

  const [infoStatus, setInfoStatus] = useState(null) // { type: 'success'|'error', msg }
  const [passStatus, setPassStatus] = useState(null)
  const [infoLoading, setInfoLoading] = useState(false)
  const [passLoading, setPassLoading] = useState(false)

  const setInfo = (k, v) => setInfoForm(p => ({ ...p, [k]: v }))
  const setPass = (k, v) => setPassForm(p => ({ ...p, [k]: v }))

  const handleInfoSubmit = async (e) => {
    e.preventDefault()
    if (!infoForm.name.trim()) {
      setInfoStatus({ type: 'error', msg: 'El nombre no puede estar vacío' })
      return
    }
    setInfoLoading(true)
    setInfoStatus(null)
    try {
      const res = await updateProfile({ name: infoForm.name.trim() })
      // Update AuthContext with new user data
      const token = localStorage.getItem('token')
      setUser(res.data?.user || { ...user, name: infoForm.name.trim() }, token)
      setInfoStatus({ type: 'success', msg: 'Nombre actualizado correctamente' })
    } catch (err) {
      setInfoStatus({ type: 'error', msg: err.message })
    } finally {
      setInfoLoading(false)
    }
  }

  const handlePassSubmit = async (e) => {
    e.preventDefault()
    if (!passForm.current_password) {
      setPassStatus({ type: 'error', msg: 'Ingresá tu contraseña actual' })
      return
    }
    if (passForm.new_password.length < 6) {
      setPassStatus({ type: 'error', msg: 'La nueva contraseña debe tener al menos 6 caracteres' })
      return
    }
    if (passForm.new_password !== passForm.confirm) {
      setPassStatus({ type: 'error', msg: 'Las contraseñas no coinciden' })
      return
    }
    setPassLoading(true)
    setPassStatus(null)
    try {
      await updateProfile({
        current_password: passForm.current_password,
        new_password: passForm.new_password,
      })
      setPassStatus({ type: 'success', msg: 'Contraseña cambiada correctamente' })
      setPassForm({ current_password: '', new_password: '', confirm: '' })
    } catch (err) {
      setPassStatus({ type: 'error', msg: err.message })
    } finally {
      setPassLoading(false)
    }
  }

  const roleColor = ROLE_COLORS[user?.role] || 'var(--accent)'
  const roleLabel = ROLE_LABELS[user?.role] || user?.role || ''

  const initials = (user?.name || '')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || '?'

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 16px' }}>
      {/* Page header */}
      <div className="page-header" style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Mi perfil</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
          Gestioná tu información personal y contraseña
        </p>
      </div>

      {/* Avatar + role banner */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
          background: `${roleColor}20`,
          border: `2px solid ${roleColor}50`,
          color: roleColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 800, letterSpacing: 1,
        }}>
          {initials}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{user?.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{user?.email}</div>
          <div style={{
            display: 'inline-block', marginTop: 6,
            padding: '2px 10px', borderRadius: 20,
            background: `${roleColor}18`, color: roleColor,
            fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
            border: `1px solid ${roleColor}40`,
          }}>
            {roleLabel.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Section 1: Información */}
      <div className="card" style={{ padding: '24px', marginBottom: 16 }}>
        <div className="form-section-title" style={{ marginBottom: 20 }}>Información personal</div>

        {infoStatus && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 18, fontSize: 13,
            background: infoStatus.type === 'success' ? 'rgba(61,232,138,0.1)' : 'rgba(232,80,64,0.1)',
            border: `1px solid ${infoStatus.type === 'success' ? 'rgba(61,232,138,0.3)' : 'rgba(232,80,64,0.3)'}`,
            color: infoStatus.type === 'success' ? 'var(--success)' : 'var(--danger)',
          }}>
            {infoStatus.msg}
          </div>
        )}

        <form onSubmit={handleInfoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Nombre completo</label>
            <input
              value={infoForm.name}
              onChange={e => setInfo('name', e.target.value)}
              placeholder="Tu nombre"
              autoComplete="name"
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Email <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 11 }}>(no editable)</span></label>
            <input
              type="email"
              value={user?.email || ''}
              readOnly
              disabled
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={infoLoading}
              style={{ minWidth: 140 }}
            >
              {infoLoading ? 'Guardando...' : 'Guardar nombre'}
            </button>
          </div>
        </form>
      </div>

      {/* Section 2: Cambiar contraseña */}
      <div className="card" style={{ padding: '24px' }}>
        <div className="form-section-title" style={{ marginBottom: 20 }}>Cambiar contraseña</div>

        {passStatus && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 18, fontSize: 13,
            background: passStatus.type === 'success' ? 'rgba(61,232,138,0.1)' : 'rgba(232,80,64,0.1)',
            border: `1px solid ${passStatus.type === 'success' ? 'rgba(61,232,138,0.3)' : 'rgba(232,80,64,0.3)'}`,
            color: passStatus.type === 'success' ? 'var(--success)' : 'var(--danger)',
          }}>
            {passStatus.msg}
          </div>
        )}

        <form onSubmit={handlePassSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Contraseña actual</label>
            <input
              type="password"
              value={passForm.current_password}
              onChange={e => setPass('current_password', e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Nueva contraseña</label>
            <input
              type="password"
              value={passForm.new_password}
              onChange={e => setPass('new_password', e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Confirmar nueva contraseña</label>
            <input
              type="password"
              value={passForm.confirm}
              onChange={e => setPass('confirm', e.target.value)}
              placeholder="Repetí la nueva contraseña"
              autoComplete="new-password"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={passLoading}
              style={{ minWidth: 160 }}
            >
              {passLoading ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
