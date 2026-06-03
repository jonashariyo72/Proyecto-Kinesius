import { createContext, useContext, useState } from 'react'
import { getSesion, limpiarSesion, guardarSesion } from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(getSesion)

  const login = (access, refresh, rol) => {
    guardarSesion(access, refresh, rol)
    setSesion({ access, refresh, rol, autenticado: true })
  }

  const logout = () => {
    limpiarSesion()
    setSesion({ access: null, refresh: null, rol: null, autenticado: false })
  }

  return (
    <AuthContext.Provider value={{ ...sesion, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)