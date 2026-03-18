import { createContext, useContext, useState, useEffect } from 'react'

const FavContext = createContext()

export function FavoritesProvider({ children }) {
  const [favs, setFavs] = useState(() => JSON.parse(localStorage.getItem('favs') || '[]'))

  useEffect(() => localStorage.setItem('favs', JSON.stringify(favs)), [favs])

  const toggle = (id) => setFavs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const isFav = (id) => favs.includes(id)

  return <FavContext.Provider value={{ favs, toggle, isFav }}>{children}</FavContext.Provider>
}

export const useFavorites = () => useContext(FavContext)
