import { useState } from 'react'
import { Link } from 'react-router-dom'

const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

const SteeringIcon = () => (
  <svg width="36" height="36" viewBox="0 0 52 52" fill="none">
    <circle cx="26" cy="26" r="23" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5"/>
    <circle cx="26" cy="26" r="7" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5"/>
    <line x1="26" y1="3" x2="26" y2="19" stroke="rgba(255,255,255,0.5)" strokeWidth="2.2" strokeLinecap="round"/>
    <line x1="26" y1="33" x2="26" y2="49" stroke="rgba(255,255,255,0.5)" strokeWidth="2.2" strokeLinecap="round"/>
    <line x1="3" y1="26" x2="19" y2="26" stroke="rgba(255,255,255,0.5)" strokeWidth="2.2" strokeLinecap="round"/>
    <line x1="33" y1="26" x2="49" y2="26" stroke="rgba(255,255,255,0.5)" strokeWidth="2.2" strokeLinecap="round"/>
  </svg>
)

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Ingresá tu email')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      // Always show success regardless of whether email exists (security best practice)
      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Error ${res.status}`)
      }
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f1117',
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

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <SteeringIcon />
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 4, color: '#f0eeeb' }}>RUEDAS</div>
          <div style={{ fontSize: 10, color: '#8b8990', letterSpacing: 3, marginTop: 2 }}>CONCESIONARIA</div>
        </div>

        {/* Card */}
        <div style={{
          background: '#1a1d2e',
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.07)',
          padding: 32,
          boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
        }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              {/* Checkmark icon */}
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(61,232,138,0.12)',
                border: '2px solid rgba(61,232,138,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="#3de88a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f0eeeb', marginBottom: 10 }}>
                Revisá tu correo
              </div>
              <div style={{ fontSize: 13, color: '#8b8990', lineHeight: 1.6 }}>
                Si el email existe, recibirás un enlace en tu correo para restablecer tu contraseña.
              </div>
              <Link
                to="/login"
                style={{
                  display: 'inline-block', marginTop: 24,
                  padding: '10px 24px', borderRadius: 8,
                  background: 'rgba(74,232,208,0.12)',
                  border: '1px solid rgba(74,232,208,0.3)',
                  color: '#4ae8d0', fontSize: 13, fontWeight: 600,
                  textDecoration: 'none', transition: 'all 0.15s',
                }}
              >
                Volver al inicio de sesion
              </Link>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#f0eeeb', marginBottom: 6 }}>
                  Recuperar contraseña
                </div>
                <div style={{ fontSize: 13, color: '#8b8990', lineHeight: 1.6 }}>
                  Ingresá tu email y te enviaremos un enlace para restablecer tu contraseña.
                </div>
              </div>

              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8, marginBottom: 18,
                  background: 'rgba(232,80,64,0.12)', border: '1px solid rgba(232,80,64,0.3)',
                  color: '#e85040', fontSize: 13,
                }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#8b8990', letterSpacing: 0.3 }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    autoComplete="email"
                    autoFocus
                    required
                    style={{
                      padding: '10px 14px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#f0eeeb', fontSize: 14, outline: 'none',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(74,232,208,0.5)' }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '11px 0', borderRadius: 8, border: 'none',
                    background: loading ? 'rgba(74,232,208,0.3)' : '#4ae8d0',
                    color: '#0f1117', fontSize: 14, fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {loading ? 'Enviando...' : 'Enviar enlace'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <Link
                  to="/login"
                  style={{ fontSize: 13, color: '#8b8990', textDecoration: 'none' }}
                >
                  Volver al inicio de sesion
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
