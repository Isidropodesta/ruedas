import { Outlet, NavLink, useLocation } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '▦', exact: true },
  { to: '/vehicles', label: 'Vehículos', icon: '🚗' },
  { to: '/sellers', label: 'Vendedores', icon: '👤' },
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
          <span className="sidebar-logo-icon">🏎</span>
          <h1>RUEDAS</h1>
          <p>Concesionaria</p>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">Menú</div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
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
