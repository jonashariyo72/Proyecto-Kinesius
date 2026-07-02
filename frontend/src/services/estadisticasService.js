import axios from 'axios'
import { BASE_URL, NGROK_HEADERS } from './config'

const api = axios.create({
  baseURL: BASE_URL,
  headers: NGROK_HEADERS,
})

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.headers['ngrok-skip-browser-warning'] = 'true'
  return config
})

// Ojo: el backend espera el query param "filtro", no "tipo"
export const obtenerEstadisticasMeses = (filtro) => {
  return api.get(`/estadisticas/meses/?filtro=${filtro}`)
}

// HU: Filtrar listado y estadísticas de clientes por abonado/asistencia
// estadoPago: 'abonado' | 'no_abonado' | ''
// asistencia: 'asistio'  | 'no_asistio'  | ''
// fecha: 'YYYY-MM-DD' (obligatoria solo si se manda asistencia)
export const obtenerClientesFiltrados = (estadoPago, asistencia, fecha) => {
  const params = new URLSearchParams()
  if (estadoPago) params.append('estado_pago', estadoPago)
  if (asistencia) params.append('asistencia', asistencia)
  if (fecha) params.append('fecha', fecha)

  return api.get(`/usuarios/clientes/filtrar/?${params.toString()}`)
}