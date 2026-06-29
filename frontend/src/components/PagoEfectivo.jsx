import { useState } from 'react'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'


export default function ModalPagoEfectivo({ access, onCerrar }) {
  const [dni, setDni]               = useState('')
  const [buscando, setBuscando]     = useState(false)
  const [saldos, setSaldos]         = useState([])
  const [mensaje, setMensaje]       = useState('')
  const [error, setError]           = useState('')
  const [procesandoId, setProcesandoId] = useState(null)
  const [resultadoOk, setResultadoOk]   = useState('')

  const buscarSaldos = async () => {
    if (!dni.trim()) return
    setBuscando(true)
    setError('')
    setMensaje('')
    setSaldos([])
    setResultadoOk('')

    try {
      const res = await fetch(`${API}/api/pagos/saldos-pendientes/${dni.trim()}/`, {
        headers: { Authorization: `Bearer ${access}` },
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'No se pudo buscar el cliente.')
      } else if (data.mensaje) {
        setMensaje(data.mensaje)
      } else {
        setSaldos(data)
      }
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setBuscando(false)
    }
  }

  const registrarPago = async (pagoId) => {
    setProcesandoId(pagoId)
    setError('')

    try {
      const res = await fetch(`${API}/api/pagos/registrar-efectivo/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access}`,
        },
        body: JSON.stringify({ pago_id: pagoId }),
      })
      const data = await res.json()

      if (res.ok) {
        setResultadoOk(data.mensaje)
        setSaldos([])
      } else {
        // Escenario 3: clase más próxima distinta
        setError(data.error ?? 'No se pudo registrar el pago.')
      }
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setProcesandoId(null)
    }
  }

  const TIPOS = {
    tren_inferior: 'Tren Inferior',
    zona_media: 'Zona Media',
    tren_superior: 'Tren Superior',
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <h3 style={s.titulo}>Registrar Pago en Efectivo</h3>
          <button style={s.btnX} onClick={onCerrar}>✕</button>
        </div>

        {!resultadoOk && (
          <>
            <p style={s.texto}>Ingresá el DNI del cliente para ver sus saldos pendientes.</p>

            <div style={s.buscarRow}>
              <input
                style={s.input}
                placeholder="DNI del cliente"
                value={dni}
                onChange={e => setDni(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && buscarSaldos()}
              />
              <button style={s.btnBuscar} onClick={buscarSaldos} disabled={buscando}>
                {buscando ? 'Buscando...' : 'Buscar'}
              </button>
            </div>

            {error    && <p style={s.error}>{error}</p>}
            {mensaje  && <p style={s.info}>{mensaje}</p>}

            {saldos.length > 0 && (
              <div style={s.listaClases}>
                <p style={s.subtitulo}>Seleccioná la clase a saldar:</p>
                {saldos.map((s_, i) => (
                  <div key={s_.pago_id} style={s.claseItem}>
                    <div>
                      <strong>{TIPOS[s_.clase_tipo] ?? s_.clase_tipo}</strong>
                      <p style={s.claseInfo}>
                        {s_.clase_fecha} — {s_.clase_hora?.slice(0,5)} hs
                        {i === 0 && <span style={s.badgeProxima}> · Próxima a pagar</span>}
                      </p>
                      <p style={s.claseSaldo}>
                        Saldo pendiente: ${Number(s_.saldo_pendiente).toLocaleString('es-AR')}
                      </p>
                    </div>
                    <button
                      style={{ ...s.btnSaldar, opacity: procesandoId === s_.pago_id ? 0.6 : 1 }}
                      onClick={() => registrarPago(s_.pago_id)}
                      disabled={procesandoId === s_.pago_id}
                    >
                      {procesandoId === s_.pago_id ? 'Procesando...' : 'Saldar en efectivo'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {resultadoOk && (
          <div>
            <p style={s.ok}>{resultadoOk}</p>
            <button style={s.btnVolverPrincipal} onClick={onCerrar}>
              Volver a la página principal
            </button>
          </div>
        )}

        {!resultadoOk && (
          <div style={s.botonesRow}>
            <button style={s.btnCancelar} onClick={onCerrar}>
              Cancelar operación
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal:   { background: '#fff', borderRadius: 14, padding: '2rem', width: '90%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 },
  header:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  titulo:  { fontSize: 18, fontWeight: 700, color: '#1a1a1a', margin: 0 },
  btnX:    { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#888' },
  texto:   { fontSize: 14, color: '#555', margin: 0 },
  buscarRow: { display: 'flex', gap: 8 },
  input:   { flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, outline: 'none' },
  btnBuscar: { padding: '9px 16px', borderRadius: 8, border: 'none', background: '#2d6a2d', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  error:   { fontSize: 13, color: '#c0392b', margin: 0, background: '#fdf0f0', padding: '8px 12px', borderRadius: 8 },
  info:    { fontSize: 13, color: '#555', margin: 0, background: '#f5f6f7', padding: '8px 12px', borderRadius: 8 },
  subtitulo: { fontSize: 13, fontWeight: 600, color: '#555', margin: '4px 0' },
  listaClases: { display: 'flex', flexDirection: 'column', gap: 10 },
  claseItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, border: '1px solid #e5e5e5', borderRadius: 10, padding: '12px 14px' },
  claseInfo: { fontSize: 13, color: '#555', margin: '4px 0' },
  claseSaldo: { fontSize: 13, fontWeight: 700, color: '#b8860b', margin: 0 },
  badgeProxima: { fontSize: 11, fontWeight: 700, color: '#2d6a2d', background: '#e8f5e9', padding: '2px 8px', borderRadius: 20, marginLeft: 6 },
  btnSaldar: { padding: '8px 14px', borderRadius: 8, border: 'none', background: '#2d6a2d', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  botonesRow: { display: 'flex', gap: 10 },
  btnCancelar: { flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', fontSize: 14, cursor: 'pointer', color: '#555' },
  ok: { fontSize: 14, color: '#2d6a2d', fontWeight: 600, background: '#e8f5e9', padding: '12px 14px', borderRadius: 8, margin: 0 },
  btnVolverPrincipal: { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#2d6a2d', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
}