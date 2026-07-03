import { useState } from 'react'
import api from '../services/clasesService'

function formatARS(amount) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)
}

const MONTO_CUOTA = 48000

// ─── Formulario tarjeta (copiado de PagoReservaPage) ─────────────────────────
function FormularioTarjeta({ montoTotal, onConfirmar, onVolver, cargando, error }) {
  const [tarjeta, setTarjeta] = useState({ numero: '', titular: '', vencimiento: '', cvv: '' })
  const [erroresTarjeta, setErroresTarjeta] = useState({})

  const TARJETAS_VALIDAS = [
    '5031755734530604',
    '4509953566233704',
    '5287338310253304',
    '4002768694395619',
  ]

  function validar() {
    const e = {}
    const numeroLimpio = tarjeta.numero.replace(/\s/g, '')
    if (numeroLimpio.length < 16) e.numero = 'Número de tarjeta inválido.'
    if (!tarjeta.titular.trim()) e.titular = 'Ingresá el nombre del titular.'
    if (!/^\d{2}\/\d{2}$/.test(tarjeta.vencimiento)) {
      e.vencimiento = 'Formato: MM/AA.'
    } else {
      const [mm, aa] = tarjeta.vencimiento.split('/').map(Number)
      const ahora = new Date()
      const expYear = 2000 + aa
      if (mm < 1 || mm > 12) {
        e.vencimiento = 'Formato: MM/AA.'
      } else if (expYear < ahora.getFullYear() || (expYear === ahora.getFullYear() && mm < ahora.getMonth() + 1)) {
        e.vencimiento = 'La tarjeta está vencida.'
      }
    }
    if (tarjeta.cvv.length < 3) e.cvv = 'CVV inválido.'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errores = validar()
    if (Object.keys(errores).length > 0) { setErroresTarjeta(errores); return }

    const numeroLimpio = tarjeta.numero.replace(/\s/g, '')
    const TARJETA_SIN_FONDOS = '5287338310253304'

    if (TARJETA_SIN_FONDOS === numeroLimpio && tarjeta.cvv === '123') {
      onConfirmar('sin_fondos')
      return
    }

    const esValida = TARJETAS_VALIDAS.includes(numeroLimpio) && tarjeta.cvv === '123'
    onConfirmar(esValida)
  }

  function handleNumero(val) {
    const clean = val.replace(/\D/g, '').slice(0, 16)
    const fmt   = clean.match(/.{1,4}/g)?.join(' ') ?? clean
    setTarjeta(t => ({ ...t, numero: fmt }))
    setErroresTarjeta(e => ({ ...e, numero: '' }))
  }

  function handleVencimiento(val) {
    let v = val.replace(/\D/g, '')
    if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2, 4)
    setTarjeta(t => ({ ...t, vencimiento: v }))
    setErroresTarjeta(e => ({ ...e, vencimiento: '' }))
  }

  return (
    <div className="pago-body">
      <button className="pago-back-btn" onClick={onVolver}>← Volver</button>
      <h2 className="pago-title">Datos de tarjeta</h2>
      <p className="pago-subtitle">Total: {formatARS(montoTotal)}</p>

      {error && <p className="auth-error">{error}</p>}

      <form onSubmit={handleSubmit} className="pago-form">
        <div className="field">
          <label htmlFor="numero">Número de tarjeta</label>
          <input
            id="numero" type="text" placeholder="1234 5678 9012 3456"
            value={tarjeta.numero} onChange={e => handleNumero(e.target.value)}
            maxLength={19} inputMode="numeric"
          />
          {erroresTarjeta.numero && <span className="field-error">{erroresTarjeta.numero}</span>}
        </div>

        <div className="field">
          <label htmlFor="titular">Nombre del titular</label>
          <input
            id="titular" type="text" placeholder="Como figura en la tarjeta"
            value={tarjeta.titular}
            onChange={e => { setTarjeta(t => ({ ...t, titular: e.target.value })); setErroresTarjeta(er => ({ ...er, titular: '' })) }}
          />
          {erroresTarjeta.titular && <span className="field-error">{erroresTarjeta.titular}</span>}
        </div>

        <div className="pago-field-row">
          <div className="field">
            <label htmlFor="vencimiento">Vencimiento</label>
            <input
              id="vencimiento" type="text" placeholder="MM/AA"
              value={tarjeta.vencimiento} onChange={e => handleVencimiento(e.target.value)}
              maxLength={5}
            />
            {erroresTarjeta.vencimiento && <span className="field-error">{erroresTarjeta.vencimiento}</span>}
          </div>
          <div className="field">
            <label htmlFor="cvv">CVV</label>
            <input
              id="cvv" type="password" placeholder="123"
              value={tarjeta.cvv}
              onChange={e => { setTarjeta(t => ({ ...t, cvv: e.target.value.replace(/\D/g, '') })); setErroresTarjeta(er => ({ ...er, cvv: '' })) }}
              maxLength={4}
            />
            {erroresTarjeta.cvv && <span className="field-error">{erroresTarjeta.cvv}</span>}
          </div>
        </div>

        <div className="pago-resumen-box">
          <span>Total a pagar:</span>
          <strong>{formatARS(montoTotal)}</strong>
        </div>

        <button type="submit" className="btn-primary" disabled={cargando}>
          {cargando ? 'Procesando...' : 'Confirmar pago'}
        </button>
      </form>
    </div>
  )
}

// ─── Pantalla de carga ────────────────────────────────────────────────────────
function ProcesandoPago() {
  return (
    <div className="pago-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 260, gap: 20 }}>
      <div style={{
        width: 56, height: 56,
        border: '5px solid var(--borde)',
        borderTop: '5px solid var(--acento, #4f8ef7)',
        borderRadius: '50%',
        animation: 'spin 0.9s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--texto)' }}>Procesando pago…</p>
      <p style={{ fontSize: '0.85rem', color: 'var(--texto-suave)' }}>No cerrés esta ventana</p>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function PagoCuotaPage({ onPagoExitoso, onCancelar }) {
  const [step, setStep]           = useState('inicio')
  const [pagoId, setPagoId]       = useState(null)
  const [cargando, setCargando]   = useState(false)
  const [error, setError]         = useState('')
  const [resultado, setResultado] = useState(null)

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
              setResultado({ exito: false, mensaje: 'Ocurrió un error al momento de realizar el pago.' })
              setStep('resultado')
            }
          } else if (metodo === 'tarjeta') {
            // El pago_cuota_id ya está creado, mostramos el formulario
            setStep('formulario-tarjeta')
          }
        } catch (err) {
          const msg = err.response?.data?.error ?? 'Ocurrió un error al momento de realizar el pago.'
          if (msg.includes('entre los dias') || msg.includes('entre los días')) {
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

   async function handleConfirmarTarjeta(esValida) {
      setStep('procesando')
      await new Promise(r => setTimeout(r, 1500))

      if (esValida === 'sin_fondos') {
        setResultado({
          exito: false,
          mensaje: 'La tarjeta no tiene fondos suficientes.'
        })
        setStep('resultado')
        return
      }

      if (!esValida) {
        setResultado({
          exito: false,
          mensaje: 'Transacción no realizada. La tarjeta ingresada no es válida.'
        })
        setStep('resultado')
        return
      }

      try {
        await api.post('/pagos/cuota/confirmar/', {
          pago_cuota_id: pagoId
        })

        setResultado({
          exito: true,
          mensaje: 'La cuota fue pagada con éxito.'
        })

        setStep('resultado')
        onPagoExitoso?.()

      } catch (err) {
        setResultado({
          exito: false,
          mensaje:
            err.response?.data?.error ??
            'Error al confirmar el pago.'
        })

        setStep('resultado')
      }
    }



  async function handleVerificar() {
    const id = sessionStorage.getItem('mp_pago_cuota_id') ?? pagoId
    if (!id) return

    setCargando(true)
    setError('')

    try {
      const { data } = await api.post('/pagos/cuota/verificar-mp/', { pago_cuota_id: id })
      sessionStorage.removeItem('mp_pago_cuota_id')

      if (data.estado === 'aprobado') {
        setResultado({ exito: true, mensaje: 'La cuota fue pagada con éxito.' })
        setStep('resultado')
        onPagoExitoso?.()
      } else {
        setResultado({ exito: false, mensaje: 'El pago no fue realizado.' })
        setStep('resultado')
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
          {step !== 'esperando-mp' && (
            <button className="pago-close-btn" onClick={onCancelar} aria-label="Cerrar">✕</button>
          )}
        </div>

        {/* ── Inicio ── */}
        {step === 'inicio' && (
          <div className="pago-body">
            <h2 className="pago-title">Pagar cuota mensual</h2>
            <p className="pago-subtitle">Mantené tu beneficio de abonado al día</p>
            <div className="pago-resumen-box">
              <span>Monto de la cuota:</span>
              <strong>{formatARS(MONTO_CUOTA)}</strong>
            </div>
            <p className="auth-hint">
              Este valor equivale a 4 clases de $15.000 con un 20% de descuento.
            </p>

            <button className="btn-primary" style={{ marginTop: 16 }} onClick={handlePagarCuota}>
              Pagar Cuota
            </button>
          </div>
        )}

        {/* ── Seleccionar método ── */}
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
              <button className="pago-metodo-btn" onClick={() => handleElegirMetodo('tarjeta')} disabled={cargando}>
                <span>💳</span>
                <span className="pago-metodo-label">Tarjeta</span>
                <span className="pago-metodo-sub">Crédito o débito</span>
              </button>
            </div>

            {cargando && <p style={{ textAlign: 'center', color: 'var(--texto-suave)' }}>Procesando...</p>}
          </div>
        )}

        {/* ── Formulario tarjeta ── */}
        {step === 'formulario-tarjeta' && (
          <FormularioTarjeta
            montoTotal={MONTO_CUOTA}
            onConfirmar={handleConfirmarTarjeta}
            onVolver={() => setStep('seleccionar-metodo')}
            cargando={cargando}
            error={error}
          />
        )}

        {/* ── Esperando MP ── */}
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

        {/* ── Procesando ── */}
        {step === 'procesando' && <ProcesandoPago />}

        {/* ── Resultado ── */}
        {step === 'resultado' && resultado && (
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