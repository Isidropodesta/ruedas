import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

async function req(path, opts = {}) {
  const token = localStorage.getItem('token')
  const headers = { ...opts.headers }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { ...opts, headers })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error')
  return data
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} hs`
  const days = Math.floor(hours / 24)
  return `hace ${days} día${days !== 1 ? 's' : ''}`
}

const BellIcon = ({ hasUnread }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path
      d="M10 2a6 6 0 0 1 6 6v3l1.5 2.5a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5L4 11V8a6 6 0 0 1 6-6z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={hasUnread ? 'rgba(232,160,64,0.15)' : 'none'}
    />
    <path
      d="M8 15a2 2 0 0 0 4 0"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
)

export default function NotificationBell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const [marking, setMarking] = useState(false)
  const containerRef = useRef(null)
  const intervalRef = useRef(null)

  const canSee = user && (user.role === 'vendedor' || user.role === 'dueno')

  const fetchNotifications = useCallback(async () => {
    if (!canSee) return
    try {
      const data = await req('/notifications')
      setNotifications(data.data || data || [])
    } catch {
      // silently fail — backend may not have this endpoint yet
    }
  }, [canSee])

  useEffect(() => {
    if (!canSee) return
    fetchNotifications()
    intervalRef.current = setInterval(fetchNotifications, 30000)
    return () => clearInterval(intervalRef.current)
  }, [canSee, fetchNotifications])

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!canSee) return null

  const unreadCount = notifications.filter(n => !n.read).length

  const handleMarkAllRead = async () => {
    setMarking(true)
    try {
      await req('/notifications/read-all', { method: 'PUT' })
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch {
      // ignore
    } finally {
      setMarking(false)
    }
  }

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      try {
        await req(`/notifications/${notification.id}/read`, { method: 'PUT' })
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        )
      } catch {
        // ignore
      }
    }
    setOpen(false)
    if (notification.link) {
      navigate(notification.link)
    }
  }

  const getTypeColor = (type) => {
    if (type === 'test_drive') return 'var(--accent)'
    return 'var(--text-muted)'
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-flex' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative',
          background: open ? 'var(--accent-soft)' : 'transparent',
          border: '1px solid',
          borderColor: open ? 'var(--accent)' : 'var(--border)',
          borderRadius: 8,
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: open ? 'var(--accent)' : 'var(--text-muted)',
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          if (!open) {
            e.currentTarget.style.borderColor = 'var(--accent)'
            e.currentTarget.style.color = 'var(--accent)'
          }
        }}
        onMouseLeave={e => {
          if (!open) {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--text-muted)'
          }
        }}
        title="Notificaciones"
      >
        <BellIcon hasUnread={unreadCount > 0} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: -4,
            right: -4,
            background: 'var(--danger)',
            color: '#fff',
            borderRadius: '50%',
            width: 18,
            height: 18,
            fontSize: 10,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            border: '2px solid var(--bg)',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: 340,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 1000,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
              Notificaciones
              {unreadCount > 0 && (
                <span style={{
                  marginLeft: 8,
                  background: 'var(--accent-soft)',
                  color: 'var(--accent)',
                  borderRadius: 20,
                  padding: '1px 7px',
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  {unreadCount} nuevas
                </span>
              )}
            </span>
            {notifications.some(n => !n.read) && (
              <button
                onClick={handleMarkAllRead}
                disabled={marking}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  fontSize: 11,
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: '2px 4px',
                  borderRadius: 4,
                  opacity: marking ? 0.5 : 1,
                }}
              >
                {marking ? 'Marcando...' : 'Marcar todas como leídas'}
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 13,
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
                Sin notificaciones nuevas
              </div>
            ) : (
              notifications.map(notification => {
                const typeColor = getTypeColor(notification.type)
                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border)',
                      cursor: notification.link ? 'pointer' : 'default',
                      opacity: notification.read ? 0.5 : 1,
                      transition: 'background 0.12s',
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                    }}
                    onMouseEnter={e => {
                      if (notification.link) e.currentTarget.style.background = 'var(--bg-card-hover)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    {/* Type indicator */}
                    <div style={{
                      width: 3,
                      alignSelf: 'stretch',
                      borderRadius: 2,
                      background: typeColor,
                      flexShrink: 0,
                      minHeight: 36,
                    }} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: notification.read ? 500 : 700,
                        fontSize: 13,
                        color: 'var(--text)',
                        marginBottom: 2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {notification.title}
                      </div>
                      {notification.body && (
                        <div style={{
                          fontSize: 12,
                          color: 'var(--text-muted)',
                          lineHeight: 1.4,
                          marginBottom: 4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}>
                          {notification.body}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--text-soft)' }}>
                        {timeAgo(notification.created_at)}
                        {!notification.read && (
                          <span style={{
                            marginLeft: 8,
                            display: 'inline-block',
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: typeColor,
                            verticalAlign: 'middle',
                          }} />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
