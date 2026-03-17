import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login as apiLogin, register as apiRegister } from '../api'
import { useAuth } from '../context/AuthContext'

const SteeringIcon = () => (
  <svg width="44" height="44" viewBox="0 0 52 52" fill="none">
    <circle cx="26" cy="26" r="23" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5"/>
    <circle cx="26" cy="26" r="7" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5"/>
    <line x1="26" y1="3" x2="26" y2="19" stroke="rgba(255,255,255,0.6)" strokeWidth="2.2" strokeLinecap="round"/>
    <line x1="26" y1="33" x2="26" y2="49" stroke="rgba(255,255,255,0.6)" strokeWidth="2.2" strokeLinecap="round"/>
    <line x1="3" y1="26" x2="19" y2="26" stroke="rgba(255,255,255,0.6)" strokeWidth="2.2" strokeLinecap="round"/>
    <line x1="33" y1="26" x2="49" y2="26" stroke="rgba(255,255,255,0.6)" strokeWidth="2.2" strokeLinecap="round"/>
  </svg>
)

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let res
      if (mode === 'login') {
        res = await apiLogin(form.email, form.password)
      } else {
        if (!form.name.trim()) { setError('El nombre es requerido'); setLoading(false); return }
        res = await apiRegister(form.name, form.email, form.password)
      }
      login(res.data.user, res.data.token)
      // Redirect based on role
      if (res.data.user.role === 'cliente') {
        navigate('/vehicles')
      } else {
        navigate('/')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const DEMO_USERS = [
    { role: 'Dueño',    email: 'admin@ruedas.com',   password: 'admin123',    color: '#e8c840', desc: 'Acceso total + gestión de usuarios' },
    { role: 'Vendedor', email: 'carlos@ruedas.com',  password: 'vendedor123', color: '#a87ff5', desc: 'Dashboard, vehículos y turnos' },
    { role: 'Cliente',  email: 'juan@email.com',     password: 'cliente123',  color: '#4ae8d0', desc: 'Catálogo y comparador' },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(74,232,208,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(74,232,208,0.04) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div style={{
        width: '100%', maxWidth: 420, position: 'relative', zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <SteeringIcon />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 4, color: 'var(--text)' }}>RUEDAS</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 3, marginTop: 2 }}>CONCESIONARIA</div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 32 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 28, background: 'var(--bg)', borderRadius: 10, padding: 4, border: '1px solid var(--border)' }}>
            {[{ key: 'login', label: 'Iniciar sesión' }, { key: 'register', label: 'Registrarse' }].map(tab => (
              <button
                key={tab.key}
                onClick={() => { setMode(tab.key); setError('') }}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: 13, transition: 'all 0.15s',
                  background: mode === tab.key ? 'var(--bg-card)' : 'transparent',
                  color: mode === tab.key ? 'var(--text)' : 'var(--text-muted)',
                  boxShadow: mode === tab.key ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 18,
              background: 'rgba(232,80,64,0.12)', border: '1px solid rgba(232,80,64,0.3)',
              color: 'var(--danger)', fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'register' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Nombre completo</label>
                <input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="Tu nombre"
                  autoComplete="name"
                />
              </div>
            )}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Contraseña</label>
              <input
                type="password"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ marginTop: 6, width: '100%', justifyContent: 'center', fontSize: 14, padding: '11px 0' }}
            >
              {loading ? 'Cargando...' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
            </button>
          </form>

          {mode === 'register' && (
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 16, marginBottom: 0 }}>
              Las cuentas nuevas se crean como <strong style={{ color: 'var(--text-soft)' }}>Cliente</strong>. El dueño puede cambiar tu rol.
            </p>
          )}
        </div>

        {/* Demo users */}
        <div style={{
          marginTop: 20,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: '14px 16px',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, textAlign: 'center' }}>
            👆 Usuarios de prueba — click para autocompletar
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DEMO_USERS.map(u => (
              <button
                key={u.role}
                onClick={() => { setMode('login'); setForm({ ...form, email: u.email, password: u.password }); setError('') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 8, border: `1px solid ${u.color}30`,
                  background: `${u.color}08`, cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.15s', width: '100%',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${u.color}18`; e.currentTarget.style.borderColor = `${u.color}60` }}
                onMouseLeave={e => { e.currentTarget.style.background = `${u.color}08`; e.currentTarget.style.borderColor = `${u.color}30` }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: `${u.color}20`, color: u.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
                }}>
                  {u.role.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: u.color }}>{u.role}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {u.desc}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                    {u.email} · {u.password}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
