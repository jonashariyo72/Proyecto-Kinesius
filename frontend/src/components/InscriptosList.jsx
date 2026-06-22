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

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <div>
            <h2 style={s.titulo}>Inscriptos</h2>
            <p style={s.sub}>{clase.fecha_clase} — {clase.hora_inicio?.slice(0,5)} hs</p>
          </div>
          <button style={s.btnX} onClick={onCerrar}>✕</button>
        </div>

        {loading && <p style={s.estado}>Cargando...</p>}
        {error   && <p style={s.error}>{error}</p>}

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
                <span style={{
                  ...s.badge,
                  background: i.asistio ? '#e8f5e9' : '#f5f5f5',
                  color: i.asistio ? '#2d6a2d' : '#888',
                }}>
                  {i.asistio ? 'Asistió' : 'Pendiente'}
                </span>
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
  modal:   { background: '#fff', borderRadius: 14, padding: '2rem', width: '90%', maxWidth: 500, maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 },
  header:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  titulo:  { fontSize: 18, fontWeight: 700, color: '#1a1a1a', margin: 0 },
  sub:     { fontSize: 13, color: '#888', margin: '4px 0 0' },
  btnX:    { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' },
  estado:  { textAlign: 'center', color: '#aaa', padding: '2rem' },
  error:   { color: '#c0392b', fontSize: 13 },
  lista:   { display: 'flex', flexDirection: 'column', gap: 10 },
  fila:    { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f9f9f9', borderRadius: 10, border: '1px solid #eee' },
  num:     { fontSize: 13, fontWeight: 700, color: '#aaa', minWidth: 20 },
  info:    { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  nombre:  { fontSize: 14, fontWeight: 600, color: '#1a1a1a' },
  email:   { fontSize: 12, color: '#888' },
  badge:   { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 },
}