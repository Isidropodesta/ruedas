import { useState, useEffect } from 'react'
import { getUsers, createUser, updateUser, deleteUser, getSellers } from '../api'
import { useAuth } from '../context/AuthContext'

const ROLE_CONFIG = {
  cliente:  { label: 'Cliente',  color: '#4ae8d0', bg: 'rgba(74,232,208,0.12)'  },
  vendedor: { label: 'Vendedor', color: '#a87ff5', bg: 'rgba(168,127,245,0.12)' },
  dueno:    { label: 'Dueño',   color: '#e8c840', bg: 'rgba(232,200,64,0.12)'  },
}

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export default function Users() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [sellers, setSellers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null) // null = create, obj = edit
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'cliente', seller_id: '' })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([getUsers(), getSellers()])
      .then(([u, s]) => { setUsers(u.data || []); setSellers(s.data || []) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditUser(null)
    setForm({ name: '', email: '', password: '', role: 'cliente', seller_id: '' })
    setFormError('')
    setShowModal(true)
  }

  const openEdit = (u) => {
    setEditUser(u)
    setForm({ name: u.name, email: u.email, password: '', role: u.role, seller_id: u.seller_id || '' })
    setFormError('')
    setShowModal(true)
  }

  const handleSubmit = async () => {
    setFormError('')
    if (!form.name || !form.email || (!editUser && !form.password) || !form.role) {
      setFormError('Nombre, email, rol son requeridos' + (!editUser ? ' y contraseña' : ''))
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        name: form.name,
        email: form.email,
        role: form.role,
        seller_id: form.seller_id || null,
      }
      if (form.password) payload.password = form.password

      if (editUser) {
        const res = await updateUser(editUser.id, payload)
        setUsers(prev => prev.map(u => u.id === editUser.id ? res.data : u))
      } else {
        const res = await createUser(payload)
        setUsers(prev => [res.data, ...prev])
      }
      setShowModal(false)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActive = async (u) => {
    try {
      const res = await updateUser(u.id, { active: !u.active })
      setUsers(prev => prev.map(x => x.id === u.id ? res.data : x))
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDelete = async (u) => {
    if (!confirm(`¿Eliminar a ${u.name}?`)) return
    try {
      await deleteUser(u.id)
      setUsers(prev => prev.filter(x => x.id !== u.id))
    } catch (err) {
      alert(err.message)
    }
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const roleCounts = {
    total: users.length,
    cliente: users.filter(u => u.role === 'cliente').length,
    vendedor: users.filter(u => u.role === 'vendedor').length,
    dueno: users.filter(u => u.role === 'dueno').length,
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Gestión de Usuarios</h2>
          <p>Administrá roles y accesos del sistema</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Nuevo Usuario</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: roleCounts.total, color: 'var(--accent)' },
          { label: 'Clientes', value: roleCounts.cliente, color: '#4ae8d0' },
          { label: 'Vendedores', value: roleCounts.vendedor, color: '#a87ff5' },
          { label: 'Dueños', value: roleCounts.dueno, color: '#e8c840' },
        ].map(s => (
          <div key={s.label} style={{
            padding: '12px 20px', borderRadius: 10,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="loading">Cargando usuarios...</div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">👤</span>
              <p>No hay usuarios registrados.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>USUARIO</th>
                    <th>EMAIL</th>
                    <th>ROL</th>
                    <th>ESTADO</th>
                    <th>REGISTRO</th>
                    <th style={{ width: 120 }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const rc = ROLE_CONFIG[u.role] || ROLE_CONFIG.cliente
                    const isMe = u.id === me?.id
                    return (
                      <tr key={u.id} style={{ opacity: u.active ? 1 : 0.5 }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: rc.bg, color: rc.color,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 800, flexShrink: 0,
                              border: `1.5px solid ${rc.color}44`,
                            }}>
                              {getInitials(u.name)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>
                                {u.name} {isMe && <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 11 }}>(vos)</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{u.email}</td>
                        <td>
                          <span style={{
                            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                            background: rc.bg, color: rc.color, border: `1px solid ${rc.color}44`,
                            textTransform: 'uppercase', letterSpacing: 0.5,
                          }}>
                            {rc.label}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${u.active ? 'available' : 'withdrawn'}`}>
                            <span className="status-dot" />
                            {u.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                          {new Date(u.created_at).toLocaleDateString('es-AR')}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => openEdit(u)}
                            >
                              Editar
                            </button>
                            {!isMe && (
                              <>
                                <button
                                  className={`btn btn-sm ${u.active ? 'btn-danger' : 'btn-success'}`}
                                  onClick={() => toggleActive(u)}
                                  style={{ fontSize: 11, padding: '4px 8px' }}
                                >
                                  {u.active ? 'Desactivar' : 'Activar'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-title">{editUser ? 'Editar Usuario' : 'Nuevo Usuario'}</div>
            {formError && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 14,
                background: 'rgba(232,80,64,0.12)', border: '1px solid rgba(232,80,64,0.3)',
                color: 'var(--danger)', fontSize: 13,
              }}>{formError}</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label>Nombre completo *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nombre" />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@ejemplo.com" />
              </div>
              <div className="form-group">
                <label>Contraseña {editUser ? '(dejá vacío para no cambiar)' : '*'}</label>
                <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" />
              </div>
              <div className="form-group">
                <label>Rol *</label>
                <select value={form.role} onChange={e => set('role', e.target.value)}>
                  <option value="cliente">Cliente</option>
                  <option value="vendedor">Vendedor</option>
                  <option value="dueno">Dueño</option>
                </select>
              </div>
              {form.role === 'vendedor' && (
                <div className="form-group">
                  <label>Vincular con vendedor</label>
                  <select value={form.seller_id} onChange={e => set('seller_id', e.target.value)}>
                    <option value="">Sin vincular</option>
                    {sellers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Guardando...' : editUser ? 'Guardar cambios' : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
