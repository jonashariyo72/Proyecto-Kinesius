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

export default api