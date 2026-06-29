import axios from 'axios'
import { BASE_URL, NGROK_HEADERS } from './config'

const api = axios.create({
  baseURL: `${BASE_URL}/usuarios`,
  headers: NGROK_HEADERS,
})

// Agrega el token JWT a cada request automáticamente
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.headers['ngrok-skip-browser-warning'] = 'true'
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