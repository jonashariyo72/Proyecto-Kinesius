/**
 * PagoRetornoPages.jsx
 *
 * Tres páginas que MercadoPago usa como redirect al finalizar el pago:
 *   /pago-exitoso   → status approved
 *   /pago-fallido   → status rejected / cancelled
 *   /pago-pendiente → status in_process / pending
 *
 * MP agrega estos query params a la URL de retorno:
 *   ?payment_id=<id_mp>&status=approved&external_reference=<pago_id>&pago_id=<pago_id>
 *
 * La página lee pago_id, llama a /api/pagos/confirmar/ y redirige a /mis-reservas.
 *
 * Registrá estas rutas en tu Router:
 *   <Route path="/pago-exitoso"   element={<PagoExitoso />} />
 *   <Route path="/pago-fallido"   element={<PagoFallido />} />
 *   <Route path="/pago-pendiente" element={<PagoPendiente />} />
 */

import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { confirmarPago } from '../services/pagoService'

// ─── Componente base compartido ───────────────────────────────────────────────
function PagoRetornoBase({ estado, titulo, subtitulo, emoji, colorClass, accionExtra }) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const pagoId = searchParams.get('pago_id') || sessionStorage.getItem('mp_pago_id')
  const paymentId   = searchParams.get('payment_id')  // ID que da MP

  const [procesando, setProcesando] = useState(true)
  const [error, setError]           = useState('')

  useEffect(() => {
    // Solo llamamos a confirmar si tenemos un pago real en el backend.
    // Si no hay pago_id es el mock de prueba — igual mostramos la pantalla.
    if (!pagoId) {
      setProcesando(false)
      return
    }

    confirmarPago({
      pagoId:               Number(pagoId),
      estado,                                    // 'aprobado' | 'rechazado'
      idTransaccionExterna: paymentId ?? '',
    })
      .catch((err) => {
        // Si el pago ya fue confirmado antes (ej. doble redirect) ignoramos el error
        const msg = err.response?.data?.error ?? ''
        if (!msg.includes('ya fue procesado')) {
          setError(msg || 'No pudimos registrar el resultado del pago.')
        }
      })
      .finally(() => {
        sessionStorage.removeItem('mp_pago_id')
        setProcesando(false)
        navigate('/cliente')
})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

function irAMisReservas() {
  navigate('/cliente')
}

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logo}>
          <span style={styles.logoK}>K</span>
          <span style={styles.logoText}>INESCIUS</span>
        </div>

        {procesando ? (
          <>
            <div style={styles.spinner} />
            <p style={styles.hint}>Registrando resultado del pago...</p>
          </>
        ) : (
          <>
            <div style={styles.emoji}>{emoji}</div>
            <h2 style={{ ...styles.titulo, color: colorClass }}>{titulo}</h2>
            <p style={styles.subtitulo}>{subtitulo}</p>

            {error && <p style={styles.error}>{error}</p>}

            {accionExtra}

            <button style={styles.btnPrimary} onClick={irAMisReservas}>
              Ver mis reservas
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Pago aprobado ────────────────────────────────────────────────────────────
export function PagoExitoso() {
  return (
    <PagoRetornoBase
      estado="aprobado"
      emoji="🎉"
      titulo="¡Pago aprobado!"
      subtitulo="Tu reserva quedó confirmada. Te esperamos."
      colorClass="#16a34a"
    />
  )
}

// ─── Pago rechazado / cancelado ───────────────────────────────────────────────
export function PagoFallido() {
  return (
    <PagoRetornoBase
      estado="rechazado"
      emoji="❌"
      titulo="El pago no se completó"
      subtitulo="Podés intentarlo de nuevo desde tu reserva."
      colorClass="#dc2626"
      accionExtra={
        <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: 8 }}>
          Si el importe fue debitado y el error persiste, contactá a soporte.
        </p>
      }
    />
  )
}

// ─── Pago no realizado ───────────────────────────────────────────────────────────
export function PagoPendiente() {
  return (
    <PagoRetornoBase
      estado="rechazado"
      emoji="⏳"
      titulo="El pago no se completó"
      subtitulo="La reserva no fue confirmada. Podés intentarlo nuevamente."
      colorClass="#d97706"
    />
  )
}

// ─── Estilos inline (para no depender de pago.css en estas páginas) ───────────
const styles = {
  overlay: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--fondo, #f3f4f6)',
  },
  card: {
    background: 'white',
    borderRadius: 16,
    padding: '2.5rem 2rem',
    maxWidth: 420,
    width: '90%',
    textAlign: 'center',
    boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
  },
  logo: { display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 },
  logoK: { fontSize: '1.6rem', fontWeight: 900, color: 'var(--primario, #2563eb)' },
  logoText: { fontSize: '1rem', fontWeight: 700, letterSpacing: 3 },
  emoji: { fontSize: '3rem' },
  titulo: { fontSize: '1.4rem', fontWeight: 700, margin: 0 },
  subtitulo: { color: '#6b7280', margin: 0 },
  hint: { color: '#6b7280', fontSize: '0.9rem' },
  error: { color: '#dc2626', fontSize: '0.85rem', margin: 0 },
  btnPrimary: {
    marginTop: 12,
    padding: '0.65rem 1.5rem',
    background: 'var(--primario, #2563eb)',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  },
  spinner: {
    width: 40, height: 40,
    border: '4px solid #e5e7eb',
    borderTop: '4px solid var(--primario, #2563eb)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '1rem auto',
  },
}