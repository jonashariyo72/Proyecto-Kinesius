import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export default function Clientes() {
  const { access } = useAuth()
  const [clientes, setClientes]   = useState([])
  const [cargando, setCargando]   = useState(true)
  const [error, setError]         = useState(null)
  const [busqueda, setBusqueda]   = useState('')

  useEffect(() => {
  fetch(`${API}/api/usuarios/clientes/`, {
      headers: { Authorization: `Bearer ${access}` },
    })
      .then(r => {
        if (!r.ok) throw new Error('No se pudo cargar la lista de clientes')
        return r.json()
      })
      .then(data => setClientes(data))
      .catch(e => setError(e.message))
      .finally(() => setCargando(false))
  }, [access])

  const filtrados = clientes.filter(c => {
    const q = busqueda.toLowerCase()
    return (
      c.nombre.toLowerCase().includes(q)   ||
      c.apellido.toLowerCase().includes(q) ||
      (`${c.nombre} ${c.apellido}`).toLowerCase().includes(q) ||
      c.dni.includes(q)                    ||
      c.email.toLowerCase().includes(q)
    )
  })

  return (
    <div style={s.wrap}>
      {/* Encabezado */}
      <div style={s.topBar}>
        <div>
          <h2 style={s.title}>Clientes registrados</h2>
          {!cargando && !error && (
            <p style={s.sub}>{clientes.length} cliente{clientes.length !== 1 ? 's' : ''} en total</p>
          )}
        </div>
        <input
          style={s.search}
          placeholder="Buscar por nombre, apellido o DNI…"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      {/* Estados */}
      {cargando && <p style={s.msg}>Cargando…</p>}
      {error    && <p style={{ ...s.msg, color: '#c0392b' }}>{error}</p>}

      {/* Tabla */}
      {!cargando && !error && (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {['Nombre', 'DNI', 'Email', 'Abonado', 'Estado'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ ...s.td, textAlign: 'center', color: '#999' }}>
                    No hay clientes registrados en el centro
                  </td>
                </tr>
              ) : (
                filtrados.map((c, i) => (
                  <tr key={c.id} style={i % 2 === 0 ? s.rowEven : s.rowOdd}>
                    <td style={s.td}>{c.nombre} {c.apellido}</td>
                    <td style={s.td}>{c.dni}</td>
                    <td style={s.td}>{c.email}</td>
                    <td style={s.td}>
                      <span style={c.es_abonado ? s.badgeOn : s.badgeOff}>
                        {c.es_abonado
                          ? `Abonado${c.fecha_venc_cuota ? ` · vence ${c.fecha_venc_cuota}` : ''}`
                          : 'No abonado'}
                      </span>
                    </td>
                    <td style={s.td}>
                      {c.suspendido
                        ? <span style={s.badgeSusp}>Suspendido</span>
                        : <span style={s.badgeActivo}>Activo</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── Estilos ── */
const s = {
  wrap:       { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,.08)' },
  topBar:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem', gap: '1rem', flexWrap: 'wrap' },
  title:      { margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a1a' },
  sub:        { margin: '4px 0 0', fontSize: 13, color: '#888' },
  search:     { padding: '8px 14px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, width: 280, outline: 'none' },
  msg:        { textAlign: 'center', padding: '2rem', color: '#888', fontSize: 14 },
  tableWrap:  { overflowX: 'auto' },
  table:      { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:         { textAlign: 'left', padding: '10px 14px', background: '#f8f9fa', color: '#555', fontWeight: 600, borderBottom: '2px solid #e5e5e5', whiteSpace: 'nowrap' },
  td:         { padding: '10px 14px', borderBottom: '1px solid #f0f0f0', color: '#333', verticalAlign: 'middle' },
  rowEven:    { background: '#fff' },
  rowOdd:     { background: '#fafafa' },
  badgeOn:    { background: '#e8f5e9', color: '#2d6a2d', borderRadius: 20, padding: '3px 10px', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' },
  badgeOff:   { background: '#f5f5f5', color: '#888',    borderRadius: 20, padding: '3px 10px', fontWeight: 600, fontSize: 12 },
  badgeSusp:  { background: '#fdecea', color: '#c0392b', borderRadius: 20, padding: '3px 10px', fontWeight: 600, fontSize: 12 },
  badgeActivo:{ background: '#e8f5e9', color: '#2d6a2d', borderRadius: 20, padding: '3px 10px', fontWeight: 600, fontSize: 12 },
}