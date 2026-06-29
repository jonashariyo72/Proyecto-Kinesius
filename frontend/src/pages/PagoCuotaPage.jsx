import { useState } from 'react'
import api from '../services/clasesService'

function formatARS(amount) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)
}

const MONTO_CUOTA = 48000 // 4 clases de 15000 con 20% de descuento

export default function PagoCuotaPage({ onPagoExitoso, onCancelar }) {
  // inicio -> seleccionar-metodo -> esperando-mp -> resultado
  const [step, setStep]         = useState('inicio')
  const [pagoId, setPagoId]     = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError]       = useState('')
  const [resultado, setResultado] = useState(null)

  // Escenario 1 y 2: arranca el flujo, valida el rango de días en el backend
  async function handlePagarCuota() {
    setStep('seleccionar-metodo')
    setError('')
  }

  async function handleElegirMetodo(metodo) {
    setCargando(true)
    setError('')
    try {
      const { data } = await api.post('/pagos/cuota/iniciar/', { metodo_pago: metodo })
      setPagoId(data.pago_cuota_id)

      if (metodo === 'mercadopago') {
        if (data.mp_init_point) {
          sessionStorage.setItem('mp_pago_cuota_id', data.pago_cuota_id)
          window.open(data.mp_init_point, '_blank')
          setStep('esperando-mp')
        } else {
          // Escenario 3: error en el pago
          setResultado({ exito: false, mensaje: 'Ocurrió un error al momento de realizar el pago.' })
          setStep('resultado')
        }
      }
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Ocurrió un error al momento de realizar el pago.'
      // Escenario 2: día fuera de rango -> se muestra el error en la misma pantalla
      // Escenario 3: error en el pago -> redirige a resultado
      if (msg.includes('entre los días')) {
        setError(msg)
        setStep('seleccionar-metodo')
      } else {
        setResultado({ exito: false, mensaje: msg })
        setStep('resultado')
      }
    } finally {
      setCargando(false)
    }
  }

  async function handleVerificar() {
    const id = sessionStorage.getItem('mp_pago_cuota_id') ?? pagoId
    if (!id) return

    setCargando(true)
    setError('')
    try {
      const { data } = await api.post('/pagos/cuota/verificar-mp/', { pago_cuota_id: id })

      if (data.estado === 'aprobado') {
        sessionStorage.removeItem('mp_pago_cuota_id')
        setResultado({ exito: true, mensaje: 'La cuota fue pagada con éxito.' })
        setStep('resultado')
        onPagoExitoso?.()
      } else if (data.estado === 'rechazado') {
        sessionStorage.removeItem('mp_pago_cuota_id')
        setResultado({ exito: false, mensaje: 'Ocurrió un error al momento de realizar el pago.' })
        setStep('resultado')
      } else {
        setError('Todavía no encontramos el pago aprobado en Mercado Pago.')
      }
    } catch (err) {
      setError(err.response?.data?.error ?? 'No pudimos verificar el pago.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="pago-overlay">
      <div className="pago-card">
        <div className="pago-header">
          <div className="auth-logo" style={{ marginBottom: 0 }}>
            <span className="logo-k">K</span>
            <span className="logo-text">INESCIUS</span>
          </div>
          <button className="pago-close-btn" onClick={onCancelar} aria-label="Cerrar">✕</button>
        </div>

        {/* ── Paso inicial ── */}
        {step === 'inicio' && (
          <div className="pago-body">
            <h2 className="pago-title">Pagar cuota mensual</h2>
            <p className="pago-subtitle">Mantené tu beneficio de abonado al día</p>

            <div className="pago-resumen-box">
              <span>Monto de la cuota:</span>
              <strong>{formatARS(MONTO_CUOTA)}</strong>
            </div>

            <button className="btn-primary" style={{ marginTop: 16 }} onClick={handlePagarCuota}>
              Pagar Cuota
            </button>
          </div>
        )}

        {/* ── Seleccionar pago (Escenario 1 y 2) ── */}
        {step === 'seleccionar-metodo' && (
          <div className="pago-body">
            <button className="pago-back-btn" onClick={() => setStep('inicio')}>← Volver</button>
            <h2 className="pago-title">Seleccionar pago</h2>
            <p className="pago-subtitle">Cuota mensual — {formatARS(MONTO_CUOTA)}</p>

            {error && <p className="auth-error">{error}</p>}

            <div className="pago-metodos-grid">
              <button className="pago-metodo-btn" onClick={() => handleElegirMetodo('mercadopago')} disabled={cargando}>
                <span>🛒</span>
                <span className="pago-metodo-label">Mercado Pago</span>
                <span className="pago-metodo-sub">QR, dinero en cuenta, tarjeta</span>
              </button>
            </div>

            {cargando && <p style={{ textAlign: 'center', color: 'var(--texto-suave)' }}>Procesando...</p>}
          </div>
        )}

        {/* ── Esperando confirmación de MP ── */}
        {step === 'esperando-mp' && (
          <div className="pago-confirmacion-wrap">
            <div className="pago-confirmacion-icon">✓</div>
            <h2 className="pago-confirmacion-title">Confirmar la operación, por favor</h2>
            {error && <p className="auth-error">{error}</p>}
            <button className="btn-primary pago-confirmacion-btn" onClick={handleVerificar} disabled={cargando}>
              {cargando ? 'Verificando...' : 'Confirmar'}
            </button>
          </div>
        )}

        {/* ── Resultado ── */}
        {step === 'resultado' && (
          <div className="pago-body">
            <div className="pago-resultado">
              <div className="pago-resultado-emoji">{resultado.exito ? '🎉' : '❌'}</div>
              <h2 className={`pago-resultado-titulo pago-resultado-titulo--${resultado.exito ? 'exito' : 'rechazo'}`}>
                {resultado.exito ? '¡Cuota pagada con éxito!' : 'Error al procesar el pago'}
              </h2>
              <p className="auth-hint">{resultado.mensaje}</p>

              {!resultado.exito && (
                <button className="btn-primary" style={{ marginTop: 20 }} onClick={() => setStep('seleccionar-metodo')}>
                  Intentar de nuevo
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
