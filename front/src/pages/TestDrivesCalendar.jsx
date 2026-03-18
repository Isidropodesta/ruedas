import { useState, useEffect, useMemo } from 'react'
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

const STATUS_CONFIG = {
  pending:   { label: 'Pendiente',  color: 'var(--warning)',  bg: 'rgba(232,200,64,0.15)',  border: 'rgba(232,200,64,0.3)' },
  completed: { label: 'Completado', color: 'var(--success)',  bg: 'rgba(61,232,138,0.15)',  border: 'rgba(61,232,138,0.3)' },
  cancelled: { label: 'Cancelado',  color: 'var(--danger)',   bg: 'rgba(232,80,64,0.15)',   border: 'rgba(232,80,64,0.3)' },
}

const DOW_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function formatTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function formatFullDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

function toLocalDateKey(dateStr) {
  // Returns "YYYY-MM-DD" in local timezone
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const ChevronLeft = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const ChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M7 4l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const CalendarViewIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="2.5" width="14" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M1 6.5H15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M5 1.5V3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M11 1.5V3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)

const ListViewIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 4H14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M2 8H14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M2 12H10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)

function StatusBadge({ status }) {
  const st = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 700,
      padding: '2px 8px',
      borderRadius: 20,
      background: st.bg,
      color: st.color,
      border: `1px solid ${st.border}`,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      flexShrink: 0,
    }}>
      {st.label}
    </span>
  )
}

function TestDriveItem({ td }) {
  return (
    <div style={{
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      padding: '10px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        background: (STATUS_CONFIG[td.status] || STATUS_CONFIG.pending).bg,
        border: `1px solid ${(STATUS_CONFIG[td.status] || STATUS_CONFIG.pending).border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 16,
        flexShrink: 0,
      }}>
        🚗
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
            {td.brand && td.model ? `${td.brand} ${td.model}${td.year ? ` ${td.year}` : ''}` : `Vehículo #${td.vehicle_id}`}
          </span>
          <StatusBadge status={td.status} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginTop: 1 }}>
          {td.client_name}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 3, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {formatTime(td.scheduled_at)}
          </span>
          {td.seller_name && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Vendedor: {td.seller_name}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TestDrivesCalendar() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [testDrives, setTestDrives] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState('calendar') // 'calendar' | 'list'
  const [selectedDate, setSelectedDate] = useState(null) // "YYYY-MM-DD"
  const [currentDate, setCurrentDate] = useState(() => new Date())

  const canSee = !authLoading && user && (user.role === 'vendedor' || user.role === 'dueno')

  useEffect(() => {
    if (authLoading) return
    if (!canSee) {
      navigate('/')
      return
    }
    setLoading(true)
    req('/test-drives')
      .then(data => setTestDrives(data.data || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [authLoading, canSee])

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() // 0-indexed

  // Build calendar grid for the current month
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay() // 0=Sun
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const cells = []
    // Leading empty cells
    for (let i = 0; i < firstDay; i++) cells.push(null)
    // Day cells
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    return { cells, firstDay, daysInMonth }
  }, [currentYear, currentMonth])

  // Group test drives by date key
  const drivesByDate = useMemo(() => {
    const map = {}
    testDrives.forEach(td => {
      if (!td.scheduled_at) return
      const key = toLocalDateKey(td.scheduled_at)
      if (!map[key]) map[key] = []
      map[key].push(td)
    })
    return map
  }, [testDrives])

  // Test drives for the current month
  const monthDrives = useMemo(() => {
    return testDrives
      .filter(td => {
        if (!td.scheduled_at) return false
        const d = new Date(td.scheduled_at)
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth
      })
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
  }, [testDrives, currentYear, currentMonth])

  const pendingThisMonth = monthDrives.filter(td => td.status === 'pending').length

  // Test drives for the selected day
  const selectedDrives = useMemo(() => {
    if (!selectedDate) return []
    return (drivesByDate[selectedDate] || [])
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
  }, [selectedDate, drivesByDate])

  const goToPrevMonth = () => {
    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
    setSelectedDate(null)
  }

  const goToNextMonth = () => {
    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
    setSelectedDate(null)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(null)
  }

  const today = new Date()
  const todayKey = toLocalDateKey(today.toISOString())

  const handleDayClick = (day) => {
    if (!day) return
    const y = currentYear
    const m = String(currentMonth + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    const key = `${y}-${m}-${d}`
    if (!drivesByDate[key]) {
      setSelectedDate(null)
      return
    }
    setSelectedDate(prev => prev === key ? null : key)
  }

  if (authLoading || loading) {
    return <div className="loading">Cargando calendario...</div>
  }

  if (error) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--danger)' }}>
        Error: {error}
      </div>
    )
  }

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h2>Calendario de Test Drives</h2>
          <p>
            {MONTH_NAMES[currentMonth]} {currentYear}
            {pendingThisMonth > 0 && (
              <span style={{
                marginLeft: 12,
                background: 'rgba(232,200,64,0.15)',
                color: 'var(--warning)',
                border: '1px solid rgba(232,200,64,0.3)',
                borderRadius: 20,
                padding: '2px 10px',
                fontSize: 12,
                fontWeight: 700,
              }}>
                {pendingThisMonth} pendiente{pendingThisMonth !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={goToToday}
            style={{ fontSize: 13 }}
          >
            Hoy
          </button>
          <button
            className={`btn ${viewMode === 'calendar' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('calendar')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <CalendarViewIcon />
            Calendario
          </button>
          <button
            className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('list')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <ListViewIcon />
            Lista
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div style={{ display: 'grid', gridTemplateColumns: selectedDate ? '1fr 320px' : '1fr', gap: 20, alignItems: 'start' }}>
          {/* Calendar */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Month navigation */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
            }}>
              <button
                onClick={goToPrevMonth}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                <ChevronLeft />
              </button>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                {MONTH_NAMES[currentMonth]} {currentYear}
              </span>
              <button
                onClick={goToNextMonth}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                <ChevronRight />
              </button>
            </div>

            {/* Day of week headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              borderBottom: '1px solid var(--border)',
            }}>
              {DOW_LABELS.map(label => (
                <div key={label} style={{
                  padding: '8px 4px',
                  textAlign: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  {label}
                </div>
              ))}
            </div>

            {/* Calendar cells */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
            }}>
              {calendarGrid.cells.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} style={{ minHeight: 80, borderRight: '1px solid var(--border-soft)', borderBottom: '1px solid var(--border-soft)' }} />
                }

                const y = currentYear
                const m = String(currentMonth + 1).padStart(2, '0')
                const d = String(day).padStart(2, '0')
                const key = `${y}-${m}-${d}`
                const dayDrives = drivesByDate[key] || []
                const isToday = key === todayKey
                const isSelected = selectedDate === key
                const hasDrives = dayDrives.length > 0

                const pendingDrives = dayDrives.filter(td => td.status === 'pending')
                const completedDrives = dayDrives.filter(td => td.status === 'completed')
                const cancelledDrives = dayDrives.filter(td => td.status === 'cancelled')

                return (
                  <div
                    key={key}
                    onClick={() => handleDayClick(day)}
                    style={{
                      minHeight: 80,
                      padding: '6px 8px',
                      borderRight: '1px solid var(--border-soft)',
                      borderBottom: '1px solid var(--border-soft)',
                      cursor: hasDrives ? 'pointer' : 'default',
                      background: isSelected
                        ? 'var(--accent-soft)'
                        : isToday
                          ? 'rgba(255,255,255,0.03)'
                          : 'transparent',
                      transition: 'background 0.12s',
                      position: 'relative',
                    }}
                    onMouseEnter={e => {
                      if (hasDrives && !isSelected) e.currentTarget.style.background = 'var(--bg-card-hover)'
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.background = isToday ? 'rgba(255,255,255,0.03)' : 'transparent'
                    }}
                  >
                    {/* Day number */}
                    <div style={{
                      fontWeight: isToday ? 800 : 500,
                      fontSize: 13,
                      color: isToday ? 'var(--accent)' : isSelected ? 'var(--accent)' : 'var(--text)',
                      marginBottom: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}>
                      {isToday ? (
                        <span style={{
                          background: 'var(--accent)',
                          color: '#000',
                          borderRadius: '50%',
                          width: 22,
                          height: 22,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 800,
                        }}>
                          {day}
                        </span>
                      ) : (
                        day
                      )}
                    </div>

                    {/* Drive dots/badges */}
                    {hasDrives && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {pendingDrives.length > 0 && (
                          <div style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: 'var(--warning)',
                            background: 'rgba(232,200,64,0.12)',
                            borderRadius: 4,
                            padding: '1px 5px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                          }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--warning)', display: 'inline-block' }} />
                            {pendingDrives.length}
                          </div>
                        )}
                        {completedDrives.length > 0 && (
                          <div style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: 'var(--success)',
                            background: 'rgba(61,232,138,0.12)',
                            borderRadius: 4,
                            padding: '1px 5px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                          }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
                            {completedDrives.length}
                          </div>
                        )}
                        {cancelledDrives.length > 0 && (
                          <div style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: 'var(--danger)',
                            background: 'rgba(232,80,64,0.12)',
                            borderRadius: 4,
                            padding: '1px 5px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                          }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--danger)', display: 'inline-block' }} />
                            {cancelledDrives.length}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Side panel for selected day */}
          {selectedDate && selectedDrives.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                    {formatFullDate(`${selectedDate}T12:00:00`)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {selectedDrives.length} turno{selectedDrives.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDate(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: 18,
                    lineHeight: 1,
                    padding: 4,
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{ padding: '0 16px', maxHeight: 480, overflowY: 'auto' }}>
                {selectedDrives.map(td => (
                  <TestDriveItem key={td.id} td={td} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* List view */
        <div>
          {/* Month navigation in list mode */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <button
              onClick={goToPrevMonth}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 8,
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <ChevronLeft />
            </button>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
            <button
              onClick={goToNextMonth}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 8,
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <ChevronRight />
            </button>
          </div>

          {monthDrives.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'var(--text-muted)',
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🗓</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Sin turnos este mes</div>
              <div style={{ fontSize: 13 }}>No hay test drives agendados para {MONTH_NAMES[currentMonth]} {currentYear}.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Group by day */}
              {(() => {
                const grouped = {}
                monthDrives.forEach(td => {
                  const key = toLocalDateKey(td.scheduled_at)
                  if (!grouped[key]) grouped[key] = []
                  grouped[key].push(td)
                })
                return Object.entries(grouped)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([dateKey, drives]) => {
                    const isToday = dateKey === todayKey
                    const hasPending = drives.some(d => d.status === 'pending')
                    return (
                      <div key={dateKey} className="card" style={{
                        padding: 0,
                        overflow: 'hidden',
                        border: hasPending ? '1px solid rgba(232,200,64,0.25)' : '1px solid var(--border)',
                      }}>
                        <div style={{
                          padding: '10px 16px',
                          borderBottom: '1px solid var(--border)',
                          background: hasPending ? 'rgba(232,200,64,0.05)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}>
                          <span style={{
                            fontWeight: 700,
                            fontSize: 13,
                            color: isToday ? 'var(--accent)' : 'var(--text)',
                            textTransform: 'capitalize',
                          }}>
                            {formatFullDate(`${dateKey}T12:00:00`)}
                            {isToday && (
                              <span style={{
                                marginLeft: 8,
                                fontSize: 10,
                                background: 'var(--accent)',
                                color: '#000',
                                borderRadius: 4,
                                padding: '1px 6px',
                                fontWeight: 800,
                              }}>
                                HOY
                              </span>
                            )}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {drives.length} turno{drives.length !== 1 ? 's' : ''}
                          </span>
                          {hasPending && (
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: 'var(--warning)',
                              background: 'rgba(232,200,64,0.12)',
                              borderRadius: 4,
                              padding: '1px 6px',
                              marginLeft: 'auto',
                            }}>
                              Pendiente{drives.filter(d => d.status === 'pending').length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div style={{ padding: '0 16px' }}>
                          {drives.map(td => <TestDriveItem key={td.id} td={td} />)}
                        </div>
                      </div>
                    )
                  })
              })()}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: 16,
        marginTop: 24,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Leyenda:</span>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: cfg.color,
              display: 'inline-block',
            }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cfg.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
