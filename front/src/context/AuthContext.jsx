import { createContext, useContext, useState, useEffect } from 'react'

const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [company, setCompany] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) { setLoading(false); return }
    fetch(`${BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const u = data.data
          setUser(u)
          // Store company info from user (joined in /auth/me)
          if (u.company_name) {
            setCompany({ id: u.company_id, name: u.company_name, slug: u.company_slug, logo_url: u.company_logo })
          }
        } else { localStorage.removeItem('token'); setToken(null) }
      })
      .catch(() => { localStorage.removeItem('token'); setToken(null) })
      .finally(() => setLoading(false))
  }, [])

  const login = (userData, userToken, companyData = null) => {
    setUser(userData)
    setToken(userToken)
    localStorage.setItem('token', userToken)
    if (companyData) setCompany(companyData)
  }

  const logout = () => {
    setUser(null)
    setCompany(null)
    setToken(null)
    localStorage.removeItem('token')
  }

  const can = (...roles) => user && roles.includes(user.role)

  return (
    <AuthContext.Provider value={{ user, company, token, login, logout, loading, can }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
