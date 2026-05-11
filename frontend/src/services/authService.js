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

// ─── Manejo de sesión en localStorage ────────────────────────────────────────

export const guardarSesion = (access, refresh, rol) => {
  localStorage.setItem('access', access)
  localStorage.setItem('refresh', refresh)
  localStorage.setItem('rol', rol)
}

export const limpiarSesion = () => {
  localStorage.removeItem('access')
  localStorage.removeItem('refresh')
  localStorage.removeItem('rol')
}

export const getSesion = () => ({
  access:      localStorage.getItem('access'),
  refresh:     localStorage.getItem('refresh'),
  rol:         localStorage.getItem('rol'),
  autenticado: !!localStorage.getItem('access'),
})