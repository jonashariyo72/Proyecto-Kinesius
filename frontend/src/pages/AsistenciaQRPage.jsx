import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/clasesService'
import { useEffect, useState, useRef } from 'react'

export default function AsistenciaQRPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [estado, setEstado] = useState('cargando')
  const [mensaje, setMensaje] = useState('Registrando asistencia...')
  const [submensaje, setSubmensaje] = useState('')
  const yaRegistro = useRef(false)

  useEffect(() => {
    if (yaRegistro.current) return
    yaRegistro.current = true

    const accessToken = sessionStorage.getItem('access')

    // Si no hay token, redirigir al login
    if (!accessToken) {
      navigate(`/login?redirect=/asistencia/qr/${token}`)
      return
    }

    async function registrar() {
      try {
        const res = await api.post(`/clases/asistencia/qr/${token}/`)

        if (res.data.mensaje?.includes('Ya registraste')) {
          setEstado('ya_registrado')
          setMensaje('Ya escaneaste el QR anteriormente')
          setSubmensaje('Tu presencia en esta clase ya fue confirmada')
        } else {
          setEstado('ok')
          setMensaje('¡Asistencia registrada!')
          setSubmensaje(res.data.mensaje || '')
        }
      } catch (err) {
        const errorMsg = err.response?.data?.error || ''
        setEstado('error')

        if (err.response?.status === 401) {
          setMensaje('Tenés que iniciar sesión primero')
          setSubmensaje('Iniciá sesión en Kinescius y volvé a escanear el QR')
        } else if (errorMsg.includes('kinesiólogo ya pasó')) {
          setMensaje('El kinesiólogo ya pasó asistencia')
          setSubmensaje('La asistencia de esta clase ya fue registrada manualmente')
        } else if (errorMsg.includes('seña pendiente')) {
          setMensaje('Tenés una seña pendiente')
          setSubmensaje('Hablá con el administrador para pagar el resto antes de ingresar')
        } else if (errorMsg.includes('reserva confirmada')) {
          setMensaje('No estás anotado en esta clase')
          setSubmensaje('No tenés una reserva confirmada para esta sesión')
        } else {
          setMensaje('No se pudo registrar')
          setSubmensaje(errorMsg || 'Intentalo de nuevo o consultá al kinesiólogo')
        }
      }
    }

    registrar()
  }, [token])

  const color = estado === 'ok' ? '#2d6a2d'
              : estado === 'ya_registrado' ? '#c8a000'
              : estado === 'error' ? '#c0392b'
              : '#555'

  const emoji = estado === 'ok' ? '✓'
              : estado === 'ya_registrado' ? '!'
              : estado === 'error' ? '✕'
              : '⏳'

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      background: '#f5f6f7',
      padding: 20
    }}>
      <div style={{
        background: '#fff',
        border: `2px solid ${color}`,
        borderRadius: 16,
        padding: '2rem',
        maxWidth: 380,
        width: '100%',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}>
        <div style={{ fontSize: 48, color }}>{emoji}</div>

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#888' }}>
          KINESCIUS
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color, margin: 0 }}>
          {mensaje}
        </h1>

        {submensaje && (
          <p style={{ fontSize: 14, color: '#666', margin: 0 }}>
            {submensaje}
          </p>
        )}
      </div>
    </div>
  )
}