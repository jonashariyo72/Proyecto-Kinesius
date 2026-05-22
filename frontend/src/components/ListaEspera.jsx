import { useEffect, useState } from 'react'
import api from '../services/clasesService'

/**
 * HU #18 - Visualizar lista de espera (admin)
 * HU #42 - Inscribirse a lista de espera (cliente)
 *
 * Props:
 *   claseId   — ID de la clase seleccionada
 *   onCerrar  — función para cerrar el panel
 *   modoAdmin — true: muestra lista (HU #18) | false: botón inscribirse (HU #42)
 *   pacienteId — ID del cliente (solo necesario cuando modoAdmin=false)
 */
export default function ListaEspera({ claseId, onCerrar, modoAdmin = true, pacienteId = null }) {
  const [lista, setLista]         = useState([])
  const [loading, setLoading]     = useState(false)
  const [mensaje, setMensaje]     = useState('')
  const [error, setError]         = useState('')
  const [procesando, setProcesando] = useState(false)

  // ------------------------------------------------------------------ //
  // HU #18 — carga la lista de espera de la clase (solo admin)
  // ------------------------------------------------------------------ //
  const cargarLista = async () => {
    setLoading(true)
    setError('')
    setMensaje('')
    try {
      const res = await api.get(`/reservas/espera/por-clase/${claseId}/`)
      // Escenario 2: lista vacía → el backend devuelve { mensaje: '...' }
      if (res.data.mensaje) {
        setMensaje(res.data.mensaje)
        setLista([])
      } else {
        // Escenario 1: hay clientes
        setLista(res.data)
      }
    } catch {
      setError('No se pudo cargar la lista de espera.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (modoAdmin) cargarLista()
  }, [claseId])

  // ------------------------------------------------------------------ //
  // HU #42 — inscribe al cliente en la lista de espera
  // ------------------------------------------------------------------ //
  const inscribirse = async () => {
    setProcesando(true)
    setError('')
    setMensaje('')
    try {
      const res = await api.post('/reservas/espera/inscribirse/', {
        paciente: pacienteId,
        clase: claseId,
      })
      setMensaje(res.data.mensaje)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo completar la inscripción.')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>

        <div style={s.header}>
          <h2 style={s.titulo}>
            {modoAdmin ? 'Lista de espera' : 'Sin cupos disponibles'}
          </h2>
          <button style={s.btnCerrar} onClick={onCerrar}>✕</button>
        </div>

        {/* ---- MODO ADMIN: HU #18 ---- */}
        {modoAdmin && (
          <>
            {loading && <p style={s.estado}>Cargando...</p>}

            {/* Escenario 2: lista vacía */}
            {!loading && mensaje && (
              <p style={s.estadoVacio}>{mensaje}</p>
            )}

            {/* Escenario 1: hay clientes */}
            {!loading && lista.length > 0 && (
              <table style={s.tabla}>
                <thead>
                  <tr>
                    <th style={s.th}>#</th>
                    <th style={s.th}>Paciente</th>
                    <th style={s.th}>Fecha inscripción</th>
                    <th style={s.th}>Notificado</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((item, i) => (
                    <tr key={item.id} style={i % 2 === 0 ? s.trPar : {}}>
                      <td style={s.td}>{i + 1}</td>
                      <td style={s.td}>{item.paciente_nombre ?? item.paciente}</td>
                      <td style={s.td}>
                        {new Date(item.fecha_inscripcion).toLocaleString('es-AR')}
                      </td>
                      <td style={s.td}>
                        <span style={item.notificado ? s.badgeSi : s.badgeNo}>
                          {item.notificado ? 'Sí' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {error && <p style={s.error}>{error}</p>}
          </>
        )}

        {/* ---- MODO CLIENTE: HU #42 ---- */}
        {!modoAdmin && (
          <div style={s.clienteWrap}>
            <p style={s.clienteTxt}>
              Esta clase no tiene cupos disponibles. Podés anotarte a la lista de
              espera y te avisaremos por mail cuando se libere un lugar.
            </p>

            {mensaje && <p style={s.ok}>{mensaje}</p>}
            {error   && <p style={s.error}>{error}</p>}

            {!mensaje && (
              <button
                style={{ ...s.btnVerde, opacity: procesando ? 0.6 : 1 }}
                onClick={inscribirse}
                disabled={procesando}
              >
                {procesando ? 'Procesando...' : 'Anotarme a lista de espera'}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

const s = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 200,
  },
  modal: {
    background: '#fff', borderRadius: 14, padding: '2rem',
    width: '90%', maxWidth: 600, maxHeight: '85vh', overflowY: 'auto',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '1.2rem',
  },
  titulo: { fontSize: 18, fontWeight: 700, color: '#1a1a1a', margin: 0 },
  btnCerrar: {
    background: 'transparent', border: 'none', fontSize: 18,
    cursor: 'pointer', color: '#888',
  },
  estado:     { textAlign: 'center', color: '#aaa', padding: '2rem 0' },
  estadoVacio:{ textAlign: 'center', color: '#555', padding: '2rem 0', fontStyle: 'italic' },
  error:      { color: '#c0392b', fontSize: 13, marginTop: 8 },
  tabla:      { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: {
    textAlign: 'left', padding: '8px 10px',
    borderBottom: '2px solid #e5e5e5', color: '#555', fontWeight: 600,
  },
  td:    { padding: '8px 10px', borderBottom: '1px solid #f0f0f0' },
  trPar: { background: '#fafafa' },
  badgeSi: {
    background: '#e8f5e9', color: '#2d6a2d',
    padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600,
  },
  badgeNo: {
    background: '#f5f5f5', color: '#888',
    padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600,
  },
  clienteWrap: { display: 'flex', flexDirection: 'column', gap: 16 },
  clienteTxt:  { color: '#555', fontSize: 14, lineHeight: 1.6, margin: 0 },
  ok: { color: '#2d6a2d', fontWeight: 600, fontSize: 14 },
  btnVerde: {
    padding: '10px 20px', borderRadius: 8, border: 'none',
    background: '#2d6a2d', color: '#fff', fontSize: 14,
    fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start',
  },
}