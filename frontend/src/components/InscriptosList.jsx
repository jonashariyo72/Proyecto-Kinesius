import { useEffect, useState } from 'react'
import api from '../services/clasesService'

export default function InscriptosList({ clase, onCerrar }) {
  const [inscriptos, setInscriptos] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  useEffect(() => {
    api.get(`/reservas/gestion/inscriptos/${clase.id}/`)
      .then(res => setInscriptos(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError('No se pudieron cargar los inscriptos.'))
      .finally(() => setLoading(false))
  }, [clase.id])

  const marcarAsistencia = async (reservaId, asistio) => {
    setError('')

    try {
      await api.post(`/clases/asistencia/manual/${clase.id}/`, {
        reserva_id: reservaId,
        asistio,
      })

      setInscriptos(prev =>
        prev.map(i =>
          i.reserva_id === reservaId
            ? { ...i, asistio, metodo_asistencia: 'MANUAL' }
            : i
        )
      )
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cargar la asistencia.')
    }
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <div>
            <h2 style={s.titulo}>Inscriptos</h2>
            <p style={s.sub}>{clase.fecha_clase} - {clase.hora_inicio?.slice(0, 5)} hs</p>
          </div>
          <button style={s.btnX} onClick={onCerrar}>x</button>
        </div>

        {loading && <p style={s.estado}>Cargando...</p>}
        {error && <p style={s.error}>{error}</p>}

        {!loading && inscriptos.length === 0 && (
          <p style={s.estado}>No hay inscriptos en esta clase.</p>
        )}

        {!loading && inscriptos.length > 0 && (
          <div style={s.lista}>
            {inscriptos.map((i, idx) => (
              <div key={i.reserva_id} style={s.fila}>
                <span style={s.num}>{idx + 1}</span>

                <div style={s.info}>
                  <span style={s.nombre}>{i.nombre} {i.apellido}</span>
                  <span style={s.email}>{i.email}</span>
                </div>

                {i.metodo_asistencia === 'QR' ? (
                  <span style={s.badgeQR}>QR confirmado</span>
                ) : i.sena_pendiente ? (
                  <span style={s.badgeSena}>Seña pendiente</span>
                ) : (
                  <div style={s.asistenciaBtns}>
                    <button
                      style={i.asistio === true ? s.btnAsistioActivo : s.btnAsistio}
                      onClick={() => marcarAsistencia(i.reserva_id, true)}
                    >
                      Asistió
                    </button>

                    <button
                      style={
                        i.asistio === false && i.metodo_asistencia === 'MANUAL'
                          ? s.btnNoAsistioActivo
                          : s.btnNoAsistio
                      }
                      onClick={() => marcarAsistencia(i.reserva_id, false)}
                    >
                      No asistió
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#fff', borderRadius: 14, padding: '2rem', width: '90%', maxWidth: 620, maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  titulo: { fontSize: 18, fontWeight: 700, color: '#1a1a1a', margin: 0 },
  sub: { fontSize: 13, color: '#888', margin: '4px 0 0' },
  btnX: { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' },
  estado: { textAlign: 'center', color: '#aaa', padding: '2rem' },
  error: { color: '#c0392b', fontSize: 13 },
  lista: { display: 'flex', flexDirection: 'column', gap: 10 },
  fila: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#f9f9f9', borderRadius: 10, border: '1px solid #eee' },
  num: { fontSize: 13, fontWeight: 700, color: '#aaa', minWidth: 20 },
  info: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  nombre: { fontSize: 14, fontWeight: 600, color: '#1a1a1a' },
  email: { fontSize: 12, color: '#888' },

  asistenciaBtns: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  btnAsistio: { padding: '7px 11px', borderRadius: 999, border: '1px solid #2d6a2d', background: '#fff', color: '#2d6a2d', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  btnAsistioActivo: { padding: '7px 11px', borderRadius: 999, border: '1px solid #2d6a2d', background: '#2d6a2d', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  btnNoAsistio: { padding: '7px 11px', borderRadius: 999, border: '1px solid #c0392b', background: '#fff', color: '#c0392b', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  btnNoAsistioActivo: { padding: '7px 11px', borderRadius: 999, border: '1px solid #c0392b', background: '#c0392b', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  badgeQR: { fontSize: 12, fontWeight: 700, padding: '7px 11px', borderRadius: 999, background: '#e8f5e9', color: '#2d6a2d', border: '1px solid #2d6a2d' },
  badgeSena: { fontSize: 12, fontWeight: 700, padding: '7px 11px', borderRadius: 999, background: '#fff8e1', color: '#c8a000', border: '1px solid #c8a000' },
}