import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000/api/usuarios',
})

// Agrega el token JWT a cada request automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Endpoints ───────────────────────────────────────────────────────────────

export const registrarCliente = (data) =>
  api.post('/registro/cliente/', data)

export const loginUsuario = (email, password) =>
  api.post('/login/', { email, password })

export const verificar2FA = (email, codigo) =>
  api.post('/verificar-2fa/', { email, codigo })

// ─── Manejo de sesión en sessionStorage ────────────────────────────────────────

export const guardarSesion = (access, refresh, rol) => {
  sessionStorage.setItem('access', access)
  sessionStorage.setItem('refresh', refresh)
  sessionStorage.setItem('rol', rol)
}

export const limpiarSesion = () => {
  sessionStorage.removeItem('access')
  sessionStorage.removeItem('refresh')
  sessionStorage.removeItem('rol')
}

export const getSesion = () => ({
  access:      sessionStorage.getItem('access'),
  refresh:     sessionStorage.getItem('refresh'),
  rol:         sessionStorage.getItem('rol'),
  autenticado: !!sessionStorage.getItem('access'),
})