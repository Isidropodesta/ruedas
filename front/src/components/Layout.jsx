import { useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import GlobalSearch from './GlobalSearch'

const DashboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="1" y="1" width="6.5" height="6.5" rx="1.5" fill="currentColor" opacity="0.9"/>
    <rect x="10.5" y="1" width="6.5" height="6.5" rx="1.5" fill="currentColor" opacity="0.9"/>
    <rect x="1" y="10.5" width="6.5" height="6.5" rx="1.5" fill="currentColor" opacity="0.9"/>
    <rect x="10.5" y="10.5" width="6.5" height="6.5" rx="1.5" fill="currentColor" opacity="0.9"/>
  </svg>
)

const CarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M3.5 10.5L5 6.5C5.3 5.6 6.1 5 7 5H11C11.9 5 12.7 5.6 13 6.5L14.5 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <rect x="2" y="10.5" width="14" height="4" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4"/>
    <circle cx="5" cy="14.5" r="1.5" fill="currentColor"/>
    <circle cx="13" cy="14.5" r="1.5" fill="currentColor"/>
    <path d="M7 8H11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
)

const PersonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="6" r="3" fill="none" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M3 15.5C3 12.5 5.7 10 9 10C12.3 10 15 12.5 15 15.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)

const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="3.5" width="14" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M2 7.5H16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M6 2V5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M12 2V5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <rect x="5" y="10" width="2.5" height="2.5" rx="0.5" fill="currentColor" opacity="0.7"/>
    <rect x="10.5" y="10" width="2.5" height="2.5" rx="0.5" fill="currentColor" opacity="0.7"/>
  </svg>
)

const CompareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="1" y="4" width="6" height="11" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4"/>
    <rect x="11" y="2" width="6" height="13" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M7 9.5H11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M9.5 7.5L11.5 9.5L9.5 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const HeartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M9 15s-6-4.5-6-8.5A3.5 3.5 0 0 1 9 4.5a3.5 3.5 0 0 1 6 2c0 4-6 8.5-6 8.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const MyTurnosIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="3.5" width="14" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M2 7.5H16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M6 2V5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M12 2V5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M6 11l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const SteeringWheelIcon = () => (
  <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
    <circle cx="26" cy="26" r="23" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5"/>
    <circle cx="26" cy="26" r="7" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5"/>
    <line x1="26" y1="3" x2="26" y2="19" stroke="rgba(255,255,255,0.7)" strokeWidth="2.2" strokeLinecap="round"/>
    <line x1="26" y1="33" x2="26" y2="49" stroke="rgba(255,255,255,0.7)" strokeWidth="2.2" strokeLinecap="round"/>
    <line x1="3" y1="26" x2="19" y2="26" stroke="rgba(255,255,255,0.7)" strokeWidth="2.2" strokeLinecap="round"/>
    <line x1="33" y1="26" x2="49" y2="26" stroke="rgba(255,255,255,0.7)" strokeWidth="2.2" strokeLinecap="round"/>
    <line x1="8.2" y1="43.8" x2="19.8" y2="32.2" stroke="rgba(255,255,255,0.45)" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="32.2" y1="19.8" x2="43.8" y2="8.2" stroke="rgba(255,255,255,0.45)" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="43.8" y1="43.8" x2="32.2" y2="32.2" stroke="rgba(255,255,255,0.45)" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="19.8" y1="19.8" x2="8.2" y2="8.2" stroke="rgba(255,255,255,0.45)" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

const HamburgerIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <line x1="3" y1="6" x2="19" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="3" y1="11" x2="19" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="3" y1="16" x2="19" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

const CloseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <line x1="4" y1="4" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="18" y1="4" x2="4" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="6.5" cy="6" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M1.5 14.5C1.5 11.9 3.7 9.8 6.5 9.8C9.3 9.8 11.5 11.9 11.5 14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <circle cx="13" cy="5.5" r="2" fill="none" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M15 13.5C15 11.6 14 10.1 12.5 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

const ROLE_LABELS = { cliente: 'Cliente', vendedor: 'Vendedor', dueno: 'Dueño' }

// Nav items per role
const navByRole = {
  dueno: [
    { to: '/', label: 'Dashboard', Icon: DashboardIcon, exact: true },
    { to: '/vehicles', label: 'Vehículos', Icon: CarIcon },
    { to: '/sellers', label: 'Vendedores', Icon: PersonIcon },
    { to: '/test-drives', label: 'Turnos', Icon: CalendarIcon },
    { to: '/compare', label: 'Comparar', Icon: CompareIcon },
    { to: '/favorites', label: 'Favoritos', Icon: HeartIcon },
    { to: '/my-test-drives', label: 'Mis Turnos', Icon: MyTurnosIcon },
    { to: '/users', label: 'Usuarios', Icon: UsersIcon },
  ],
  vendedor: [
    { to: '/', label: 'Dashboard', Icon: DashboardIcon, exact: true },
    { to: '/vehicles', label: 'Vehículos', Icon: CarIcon },
    { to: '/sellers', label: 'Vendedores', Icon: PersonIcon },
    { to: '/test-drives', label: 'Turnos', Icon: CalendarIcon },
    { to: '/compare', label: 'Comparar', Icon: CompareIcon },
    { to: '/favorites', label: 'Favoritos', Icon: HeartIcon },
    { to: '/my-test-drives', label: 'Mis Turnos', Icon: MyTurnosIcon },
  ],
  cliente: [
    { to: '/vehicles', label: 'Catálogo', Icon: CarIcon },
    { to: '/compare', label: 'Comparar', Icon: CompareIcon },
    { to: '/favorites', label: 'Favoritos', Icon: HeartIcon },
    { to: '/my-test-drives', label: 'Mis Turnos', Icon: MyTurnosIcon },
  ],
}

const pageTitles = {
  '/': 'Dashboard',
  '/vehicles': 'Vehículos',
  '/vehicles/new': 'Agregar Vehículo',
  '/sellers': 'Vendedores',
  '/sellers/new': 'Agregar Vendedor',
  '/test-drives': 'Turnos & Test Drives',
  '/compare': 'Comparador de Vehículos',
  '/users': 'Gestión de Usuarios',
  '/favorites': 'Favoritos',
  '/my-test-drives': 'Mis Turnos',
}

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = user ? (navByRole[user.role] || navByRole.cliente) : navByRole.cliente

  const getTitle = () => {
    const path = location.pathname
    if (pageTitles[path]) return pageTitles[path]
    if (path.startsWith('/vehicles/')) return 'Detalle del Vehículo'
    if (path.startsWith('/sellers/')) return 'Perfil del Vendedor'
    if (path === '/users') return 'Usuarios'
    return 'Ruedas'
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="app-layout">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} />
      )}

      <aside className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-wheel-icon">
            <SteeringWheelIcon />
          </div>
          <h1>RUEDAS</h1>
          <p>CONCESIONARIA</p>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">MENÚ</div>
          {navItems.map(({ to, label, Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={closeSidebar}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon"><Icon /></span>
              {label}
              <span className="nav-active-wheel" aria-hidden="true" />
            </NavLink>
          ))}
        </nav>

        {/* Theme toggle button */}
        <div style={{ padding: '8px 20px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={toggleTheme}
            style={{
              width: '100%', padding: '8px 0', borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-muted)',
              fontSize: 13, cursor: 'pointer', fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
            {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          </button>
        </div>

        {!user && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
            <NavLink
              to="/login"
              className="btn btn-primary"
              onClick={closeSidebar}
              style={{ display: 'block', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}
            >
              Iniciar sesión
            </NavLink>
          </div>
        )}
        {user && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: user.role === 'dueno' ? 'rgba(232,200,64,0.15)' : user.role === 'vendedor' ? 'rgba(168,127,245,0.15)' : 'rgba(74,232,208,0.15)',
                color: user.role === 'dueno' ? '#e8c840' : user.role === 'vendedor' ? '#a87ff5' : '#4ae8d0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800,
              }}>
                {user.name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {ROLE_LABELS[user.role]}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                width: '100%', padding: '7px 0', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer',
                fontWeight: 500, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.color = 'var(--danger)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="hamburger-btn" onClick={() => setSidebarOpen(o => !o)}>
              {sidebarOpen ? <CloseIcon /> : <HamburgerIcon />}
            </button>
            <span className="topbar-title">{getTitle()}</span>
          </div>
          <div className="topbar-right">
            <GlobalSearch />
            <div className="topbar-badge">
              <span className="topbar-dot" />
              {user ? `${user.name.split(' ')[0]} · ${ROLE_LABELS[user.role]}` : 'Visitante'}
            </div>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
