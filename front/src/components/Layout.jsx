import { Outlet, NavLink, useLocation } from 'react-router-dom'

const DashboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="6.5" height="6.5" rx="1.5" fill="currentColor" opacity="0.9"/>
    <rect x="10.5" y="1" width="6.5" height="6.5" rx="1.5" fill="currentColor" opacity="0.9"/>
    <rect x="1" y="10.5" width="6.5" height="6.5" rx="1.5" fill="currentColor" opacity="0.9"/>
    <rect x="10.5" y="10.5" width="6.5" height="6.5" rx="1.5" fill="currentColor" opacity="0.9"/>
  </svg>
)

const CarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3.5 10.5L5 6.5C5.3 5.6 6.1 5 7 5H11C11.9 5 12.7 5.6 13 6.5L14.5 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <rect x="2" y="10.5" width="14" height="4" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4"/>
    <circle cx="5" cy="14.5" r="1.5" fill="currentColor"/>
    <circle cx="13" cy="14.5" r="1.5" fill="currentColor"/>
    <path d="M7 8H11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
)

const PersonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="9" cy="6" r="3" fill="none" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M3 15.5C3 12.5 5.7 10 9 10C12.3 10 15 12.5 15 15.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)

const SteeringWheelIcon = () => (
  <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
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

const navItems = [
  { to: '/', label: 'Dashboard', Icon: DashboardIcon, exact: true },
  { to: '/vehicles', label: 'Vehículos', Icon: CarIcon },
  { to: '/sellers', label: 'Vendedores', Icon: PersonIcon },
]

const pageTitles = {
  '/': 'Dashboard',
  '/vehicles': 'Vehículos',
  '/vehicles/new': 'Agregar Vehículo',
  '/sellers': 'Vendedores',
  '/sellers/new': 'Agregar Vendedor',
}

export default function Layout() {
  const location = useLocation()

  const getTitle = () => {
    const path = location.pathname
    if (pageTitles[path]) return pageTitles[path]
    if (path.startsWith('/vehicles/')) return 'Detalle del Vehículo'
    if (path.startsWith('/sellers/')) return 'Perfil del Vendedor'
    return 'Ruedas'
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
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
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">
                <Icon />
              </span>
              {label}
              <span className="nav-active-wheel" aria-hidden="true" />
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          Sistema Interno v1.0
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <span className="topbar-title">{getTitle()}</span>
          <div className="topbar-right">
            <div className="topbar-badge">
              <span className="topbar-dot" />
              Conectado
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
