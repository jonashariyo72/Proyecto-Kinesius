import { useState, useEffect } from 'react'
import { iniciarPago, confirmarPago, getDetallePago } from '../services/pagoService'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import '../styles/pago.css'

// ─── Helper ───────────────────────────────────────────────────────────────────
function formatARS(amount) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)
}

async function fetchSaldoFavor(token) {
  try {
    const { data } = await axios.get('http://localhost:8000/api/pagos/saldo-favor/', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    return Number(data.saldo_disponible) || 0
  } catch {
    return 0
  }
}

// ─── Paso 1: elegir seña o total ─────────────────────────────────────────────
function ElegirTipoPago({ montoTotal, montoSena, onElegir }) {
  return (
    <div className="pago-body">
      <h2 className="pago-title">¿Cómo querés pagar?</h2>
      <p className="pago-subtitle">Elegí una opción para continuar</p>

      <div className="pago-opciones-grid">
        <button className="pago-opcion-btn" onClick={() => onElegir('sena')}>
          <span className="pago-opcion-icon">💳</span>
          <span className="pago-opcion-label">Pagar seña</span>
          <span className="pago-opcion-monto">{formatARS(montoSena)}</span>
          <span className="pago-opcion-detalle">50% del total — confirmás tu lugar ahora</span>
        </button>

        <button className="pago-opcion-btn" onClick={() => onElegir('total')}>
          <span className="pago-opcion-icon">✅</span>
          <span className="pago-opcion-label">Pagar total</span>
          <span className="pago-opcion-monto">{formatARS(montoTotal)}</span>
          <span className="pago-opcion-detalle">100% — no debés nada más al asistir</span>
        </button>
      </div>

      <div className="pago-resumen-box">
        <span>Precio de la clase:</span>
        <strong>{formatARS(montoTotal)}</strong>
      </div>
    </div>
  )
}

// ─── Paso 2: elegir método ────────────────────────────────────────────────────
function ElegirMetodoPago({ tipoPago, montoSena, montoTotal, saldoFavor, onElegir, onVolver, cargando, error }) {
  const monto = tipoPago === 'sena' ? montoSena : montoTotal
  const saldoAlcanza = saldoFavor >= monto

  return (
    <div className="pago-body">
      <button className="pago-back-btn" onClick={onVolver}>← Volver</button>
      <h2 className="pago-title">Método de pago</h2>
      <p className="pago-subtitle">
        {tipoPago === 'sena' ? `Seña: ${formatARS(montoSena)}` : `Total: ${formatARS(montoTotal)}`}
      </p>

      {error && <p className="auth-error">{error}</p>}

      <div className="pago-metodos-grid">
        <button className="pago-metodo-btn" onClick={() => onElegir('mercadopago')} disabled={cargando}>
          <span>🛒</span>
          <span className="pago-metodo-label">Mercado Pago</span>
          <span className="pago-metodo-sub">QR, dinero en cuenta, tarjeta</span>
        </button>

        <button className="pago-metodo-btn" onClick={() => onElegir('tarjeta')} disabled={cargando}>
          <span>💳</span>
          <span className="pago-metodo-label">Tarjeta</span>
          <span className="pago-metodo-sub">Crédito o débito</span>
        </button>

        <button
          className={`pago-metodo-btn pago-metodo-btn--saldo ${!saldoAlcanza ? 'pago-metodo-btn--disabled' : ''}`}
          onClick={() => saldoAlcanza && onElegir('saldo')}
          disabled={cargando || !saldoAlcanza}
          title={!saldoAlcanza ? `Tu saldo (${formatARS(saldoFavor)}) no alcanza para cubrir ${formatARS(monto)}` : ''}
        >
          <span>🏦</span>
          <span className="pago-metodo-label">Saldo a favor</span>
          <span className="pago-metodo-sub">
            {saldoFavor > 0 ? `Tenés ${formatARS(saldoFavor)} disponible` : 'No tenés saldo disponible'}
          </span>
          {!saldoAlcanza && saldoFavor > 0 && (
            <span className="pago-metodo-insuficiente">Insuficiente para {formatARS(monto)}</span>
          )}
          {!saldoAlcanza && saldoFavor === 0 && (
            <span className="pago-metodo-insuficiente">Sin saldo</span>
          )}
        </button>
      </div>

      {cargando && <p style={{ textAlign: 'center', color: 'var(--texto-suave)' }}>Iniciando pago...</p>}
    </div>
  )
}

// ─── Paso 3a: formulario tarjeta ──────────────────────────────────────────────
function FormularioTarjeta({ tipoPago, montoSena, montoTotal, onConfirmar, onVolver, cargando, error }) {
  const [tarjeta, setTarjeta] = useState({ numero: '', titular: '', vencimiento: '', cvv: '' })
  const [erroresTarjeta, setErroresTarjeta] = useState({})

  const monto = tipoPago === 'sena' ? montoSena : montoTotal

  function validar() {
    const e = {}
    if (tarjeta.numero.replace(/\s/g, '').length < 16) e.numero = 'Número de tarjeta inválido.'
    if (!tarjeta.titular.trim()) e.titular = 'Ingresá el nombre del titular.'
    if (!/^\d{2}\/\d{2}$/.test(tarjeta.vencimiento)) e.vencimiento = 'Formato: MM/AA.'
    if (tarjeta.cvv.length < 3) e.cvv = 'CVV inválido.'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errores = validar()
    if (Object.keys(errores).length > 0) { setErroresTarjeta(errores); return }
    onConfirmar('TAR-SIM-' + Date.now())
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
      <p className="pago-subtitle">
        {tipoPago === 'sena' ? `Seña: ${formatARS(montoSena)}` : `Total: ${formatARS(montoTotal)}`}
      </p>

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
          <span>Total a pagar ahora:</span>
          <strong>{formatARS(monto)}</strong>
        </div>

        <button type="submit" className="btn-primary" disabled={cargando}>
          {cargando ? 'Procesando...' : 'Confirmar pago'}
        </button>
      </form>
    </div>
  )
}

// ─── Paso 3b: confirmación saldo a favor ──────────────────────────────────────
function ConfirmarSaldo({ tipoPago, montoSena, montoTotal, saldoFavor, onConfirmar, onVolver, cargando, error }) {
  const monto = tipoPago === 'sena' ? montoSena : montoTotal

  return (
    <div className="pago-body">
      <button className="pago-back-btn" onClick={onVolver}>← Volver</button>
      <h2 className="pago-title">Pagar con saldo a favor</h2>
      <p className="pago-subtitle">Revisá el resumen antes de confirmar</p>

      {error && <p className="auth-error">{error}</p>}

      <div className="pago-saldo-resumen">
        <div className="pago-saldo-row">
          <span>Saldo disponible</span>
          <strong className="saldo-positivo">{formatARS(saldoFavor)}</strong>
        </div>
        <div className="pago-saldo-row">
          <span>Monto a descontar</span>
          <strong className="saldo-descuento">− {formatARS(monto)}</strong>
        </div>
        <div className="pago-saldo-row pago-saldo-row--total">
          <span>Saldo restante</span>
          <strong>{formatARS(saldoFavor - monto)}</strong>
        </div>
      </div>

      <button className="btn-primary" style={{ marginTop: 16 }} onClick={onConfirmar} disabled={cargando}>
        {cargando ? 'Procesando...' : 'Confirmar pago con saldo'}
      </button>
    </div>
  )
}

// ─── Paso 3c: esperando MercadoPago ──────────────────────────────────────────
// Consulta el estado del pago cada 3 segundos hasta que MP confirme o rechace
function EsperandoMercadoPago({ onPagoConfirmado }) {
  useEffect(() => {
    const pagoId = sessionStorage.getItem('mp_pago_id')
    if (!pagoId) return

    // ── Polling cada 3s ──
    const intervalo = setInterval(async () => {
      try {
        const { data } = await getDetallePago(Number(pagoId))
        if (data.estado === 'aprobado' || data.estado === 'rechazado') {
          clearInterval(intervalo)
          onPagoConfirmado(data)
        }
      } catch {
        // sigue reintentando
      }
    }, 3000)

    // ── Cuando el usuario vuelve a esta pestaña, forzamos confirmar ──
    const handleFocus = async () => {
      try {
        // Intentamos confirmar el pago (MP ya lo aprobó en su lado)
        await confirmarPago({
          pagoId:               Number(pagoId),
          estado:               'aprobado',
          idTransaccionExterna: '',
        })
      } catch {
        // Si ya fue procesado, ignoramos el error
      }
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(intervalo)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  return (
    <div className="pago-spinner-wrap">
      <div className="pago-spinner" />
      <p>Esperando confirmación de Mercado Pago...</p>
      <p style={{ fontSize: '0.8rem', color: '#888' }}>
        Una vez que pagaste, volvé a esta pestaña para continuar.
      </p>
    </div>
  )
}

// ─── Paso 4: resultado ────────────────────────────────────────────────────────
function ResultadoPago({ resultado, onReintentar }) {
  const { exito, mensaje, pago } = resultado

  return (
    <div className="pago-body">
      <div className="pago-resultado">
        <div className="pago-resultado-emoji">{exito ? '🎉' : '❌'}</div>

        <h2 className={`pago-resultado-titulo pago-resultado-titulo--${exito ? 'exito' : 'rechazo'}`}>
          {exito ? '¡Reserva confirmada!' : 'Pago rechazado'}
        </h2>
        <p className="auth-hint">{mensaje}</p>

        {exito && pago && (
          <div className="pago-comprobante">
            <div className="pago-comprobante-row">
              <span>Tipo de pago</span>
              <strong>{pago.tipo_pago_display}</strong>
            </div>
            <div className="pago-comprobante-row">
              <span>Método</span>
              <strong>{pago.metodo_pago_display}</strong>
            </div>
            <div className="pago-comprobante-row">
              <span>Monto abonado</span>
              <strong className="monto-pagado">{formatARS(pago.monto_abonado)}</strong>
            </div>
            {Number(pago.saldo_pendiente) > 0 && (
              <div className="pago-comprobante-row">
                <span>Saldo restante</span>
                <strong className="monto-saldo">{formatARS(pago.saldo_pendiente)}</strong>
              </div>
            )}
          </div>
        )}

        {!exito && (
          <button className="btn-primary" style={{ marginTop: 20 }} onClick={onReintentar}>
            Intentar de nuevo
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Página / Modal principal ─────────────────────────────────────────────────
export default function PagoReservaPage({ reservaId, montoTotalClase, onPagoExitoso, onCancelar }) {
  const { access } = useAuth()

  const montoTotal = Number(montoTotalClase)
  const montoSena  = +(montoTotal * 0.5).toFixed(2)

  const [step, setStep]             = useState('elegir-tipo')
  const [tipoPago, setTipoPago]     = useState(null)
  const [pagoId, setPagoId]         = useState(null)
  const [resultado, setResultado]   = useState(null)
  const [cargando, setCargando]     = useState(false)
  const [error, setError]           = useState('')
  const [saldoFavor, setSaldoFavor] = useState(0)

  useEffect(() => {
    fetchSaldoFavor(access).then(setSaldoFavor)
  }, [access])

  function handleElegirTipo(tipo) {
    setTipoPago(tipo)
    setStep('elegir-metodo')
  }

  async function handleElegirMetodo(metodo) {
    setError('')
    setCargando(true)
    try {
      const { data } = await iniciarPago({
        reservaId,
        tipoPago,
        metodoPago:      metodo,
        montoTotalClase: montoTotal,
      })
      setPagoId(data.pago_id)

      if (metodo === 'mercadopago') {
        if (data.mp_init_point) {
          sessionStorage.setItem('mp_pago_id', data.pago_id)
          window.open(data.mp_init_point, '_blank')
          setStep('esperando-mp')
        } else {
          setError('No se pudo generar el link de Mercado Pago.')
        }
      } else if (metodo === 'saldo') {
        setStep('confirmar-saldo')
      } else {
        setStep('formulario-tarjeta')
      }
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al iniciar el pago.')
    } finally {
      setCargando(false)
    }
  }

  async function handleConfirmarSaldo() {
    setCargando(true)
    setResultado({
      exito: true,
      mensaje: 'Tu reserva fue confirmada usando saldo a favor.',
      pago: {
        tipo_pago_display:   tipoPago === 'sena' ? 'Seña (50%)' : 'Total',
        metodo_pago_display: 'Saldo a favor',
        monto_abonado:       tipoPago === 'sena' ? montoSena : montoTotal,
        saldo_pendiente:     tipoPago === 'sena' ? montoSena : 0,
      },
    })
    setStep('resultado')
    onPagoExitoso?.({ metodo: 'saldo' })
    setCargando(false)
  }

  async function handleConfirmarTarjeta(idTransaccion) {
    setCargando(true)
    await procesarConfirmacion(pagoId, 'aprobado', idTransaccion)
    setCargando(false)
  }

  async function procesarConfirmacion(pid, estado, idTransaccion) {
    try {
      const { data } = await confirmarPago({
        pagoId:               pid,
        estado,
        idTransaccionExterna: idTransaccion,
      })
      setResultado({ exito: estado === 'aprobado', mensaje: data.mensaje, pago: data.pago })
      setStep('resultado')
      if (estado === 'aprobado') onPagoExitoso?.(data.pago)
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al confirmar el pago.')
    }
  }

  function handleReintentar() {
    setError('')
    setResultado(null)
    setStep('elegir-metodo')
  }

  // ── Callback de EsperandoMercadoPago: se llama cuando detecta el pago ──
  function handlePagoMPConfirmado(pago) {
    sessionStorage.removeItem('mp_pago_id')
    setResultado({
      exito:   pago.estado === 'aprobado',
      mensaje: pago.estado === 'aprobado' ? '¡Tu reserva fue confirmada!' : 'El pago fue rechazado.',
      pago,
    })
    setStep('resultado')
    if (pago.estado === 'aprobado') onPagoExitoso?.(pago)
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

        {step === 'elegir-tipo' && (
          <ElegirTipoPago
            montoTotal={montoTotal}
            montoSena={montoSena}
            onElegir={handleElegirTipo}
          />
        )}

        {step === 'elegir-metodo' && (
          <ElegirMetodoPago
            tipoPago={tipoPago}
            montoSena={montoSena}
            montoTotal={montoTotal}
            saldoFavor={saldoFavor}
            onElegir={handleElegirMetodo}
            onVolver={() => setStep('elegir-tipo')}
            cargando={cargando}
            error={error}
          />
        )}

        {step === 'formulario-tarjeta' && (
          <FormularioTarjeta
            tipoPago={tipoPago}
            montoSena={montoSena}
            montoTotal={montoTotal}
            onConfirmar={handleConfirmarTarjeta}
            onVolver={() => setStep('elegir-metodo')}
            cargando={cargando}
            error={error}
          />
        )}

        {step === 'confirmar-saldo' && (
          <ConfirmarSaldo
            tipoPago={tipoPago}
            montoSena={montoSena}
            montoTotal={montoTotal}
            saldoFavor={saldoFavor}
            onConfirmar={handleConfirmarSaldo}
            onVolver={() => setStep('elegir-metodo')}
            cargando={cargando}
            error={error}
          />
        )}

        {step === 'esperando-mp' && (
          <EsperandoMercadoPago
            onPagoConfirmado={handlePagoMPConfirmado}
          />
        )}

        {step === 'resultado' && (
          <ResultadoPago
            resultado={resultado}
            onReintentar={handleReintentar}
          />
        )}

      </div>
    </div>
  )
}