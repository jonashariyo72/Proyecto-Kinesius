import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
})

// Mismo interceptor que clasesService — lee de sessionStorage
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const iniciarPago = ({ reservaId, tipoPago, metodoPago, montoTotalClase }) =>
  api.post('/pagos/iniciar/', {
    reserva_id:        reservaId,
    tipo_pago:         tipoPago,
    metodo_pago:       metodoPago,
    monto_total_clase: montoTotalClase,
  })

export const confirmarPago = ({ pagoId, estado, idTransaccionExterna }) =>
  api.post('/pagos/confirmar/', {
    pago_id:                pagoId,
    estado,
    id_transaccion_externa: idTransaccionExterna,
  })

export const getMisPagos = () =>
  api.get('/pagos/mis-pagos/')

export const getDetallePago = (pagoId) =>
  api.get(`/pagos/${pagoId}/`)

export function verificarPagoMP(pagoId) {
  return api.post('/pagos/verificar-mp/', {
    pago_id: pagoId,
  })
}

export function confirmarPagoSaldo({ reservaId, tipoPago }) {
  return api.post('/pagos/confirmar-saldo/', {
    reserva_id: reservaId,
    tipo_pago: tipoPago,
  })
}