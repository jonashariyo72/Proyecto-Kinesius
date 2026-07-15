import { useEffect, useState } from 'react'
import api from '../services/clasesService'

export default function HistorialCancelaciones() {
  const [cancelaciones, setCancelaciones] = useState([])
  const [cargando, setCargando]           = useState(true)
  const [error, setError]                 = useState('')

  useEffect(() => {
    api.get('/reservas/historial-cancelaciones/')
      .then(res => setCancelaciones(res.data))
      .catch(() => setError('No se pudo cargar el historial.'))
      .finally(() => setCargando(false))
  }, [])

  if (cargando) return <p style={s.msg}>Cargando...</p>
  if (error)    return <p style={{ ...s.msg, color: '#c0392b' }}>{error}</p>

  if (cancelaciones.length === 0) {
    return (
      <div style={s.wrap}>
        <h2 style={s.titulo}>Historial de cancelaciones</h2>
        <p style={s.vacio}>No tenés cancelaciones registradas.</p>
      </div>
    )
  }

  return (
    <div style={s.wrap}>
      <h2 style={s.titulo}>Historial de cancelaciones</h2>
      <p style={s.sub}>{cancelaciones.length} cancelación{cancelaciones.length !== 1 ? 'es' : ''}</p>

      <div style={s.lista}>
        {cancelaciones.map(c => (
          <div key={c.id} style={s.card}>
            <div style={s.cardTop}>
              <div>
                <span style={s.tipoClase}>{c.tipo_clase}</span>
                <span style={s.diaHora}>{c.dia_clase} · {c.hora_clase} hs</span>
                {c.fecha_clase && (
                  <span style={s.fechaClase}>Clase del {c.fecha_clase}</span>
                )}
                {c.kinesiologo && (
                  <span style={s.fechaClase}>Kinesiólogo: {c.kinesiologo}</span>
                )}
                {c.sala && (
                  <span style={s.fechaClase}>Sala: {c.sala}</span>
                )}
              </div>
              {c.cancelacion_tardia && (
                <span style={s.badgeTardia}>Cancelación tardía</span>
              )}
            </div>

            <div style={s.cardBottom}>
              <div style={s.dato}>
                <span style={s.datoLabel}>Cancelada el</span>
                <span style={s.datoValor}>{c.fecha_cancelacion}</span>
              </div>
              <div style={s.dato}>
                <span style={s.datoLabel}>Saldo devuelto</span>
                <span style={{
                  ...s.datoValor,
                  color: c.monto_devuelto > 0 ? '#2d6a2d' : '#aaa',
                  fontWeight: 700,
                }}>
                  {c.monto_devuelto > 0
                    ? `$${c.monto_devuelto.toLocaleString('es-AR')}`
                    : 'Sin devolución'
                  }
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const s = {
  wrap:       { display: 'flex', flexDirection: 'column', gap: 16 },
  titulo:     { fontSize: 18, fontWeight: 700, color: '#1a1a1a', margin: 0 },
  sub:        { fontSize: 13, color: '#888', margin: 0 },
  msg:        { textAlign: 'center', padding: '2rem', color: '#888', fontSize: 14 },
  vacio:      { fontSize: 14, color: '#aaa', margin: 0 },
  lista:      { display: 'flex', flexDirection: 'column', gap: 10 },
  card:       { background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 },
  cardTop:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  tipoClase:  { fontSize: 15, fontWeight: 700, color: '#1a1a1a', display: 'block' },
  diaHora:    { fontSize: 13, color: '#555', display: 'block', marginTop: 2 },
  fechaClase: { fontSize: 12, color: '#888', display: 'block', marginTop: 2 },
  badgeTardia:{ fontSize: 11, fontWeight: 700, background: '#fdecea', color: '#c0392b', padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' },
  cardBottom: { display: 'flex', gap: 32, borderTop: '1px solid #f0f0f0', paddingTop: 10 },
  dato:       { display: 'flex', flexDirection: 'column', gap: 2 },
  datoLabel:  { fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.4 },
  datoValor:  { fontSize: 14, color: '#1a1a1a' },
}