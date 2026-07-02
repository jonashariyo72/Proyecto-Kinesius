import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

export default function Kinesiologos() {
  const { access } = useAuth()

  const [query, setQuery]           = useState('')
  const [resultados, setResultados] = useState(null)
  const [todos, setTodos]           = useState(null)
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [cargado, setCargado]       = useState(false)

  const fetchKines = async (q = '') => {
    setError('')
    setLoading(true)
    try {
      const url = q
        ? `${API}/usuarios/kinesiologos/?q=${encodeURIComponent(q)}`
        : `${API}/usuarios/kinesiologos/`
      const res  = await fetch(url, { headers: { 'Authorization': `Bearer ${access}` } })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Error al buscar.')
        setResultados(null)
      } else {
        setResultados(data)
        if (!q) setTodos(data)
      }
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  const cargarTodos = () => {
    setCargado(true)
    fetchKines()
  }

  const buscar = () => {
    if (!query.trim()) {
      setResultados(todos)
      setError('')
      return
    }
    fetchKines(query)
  }

  const lista = resultados ?? []

  return (
    <div style={s.contenedor}>

      {!cargado ? (
        <button style={s.btnVer} onClick={cargarTodos}>
          Ver kinesiólogos registrados
        </button>
      ) : (
        <>
          <div style={s.buscadorRow}>
            <input
              style={s.input}
              placeholder="Buscar por nombre, apellido o DNI..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscar()}
            />
            <button style={s.btnBuscar} onClick={buscar} disabled={loading}>
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
            {query && (
              <button style={s.btnLimpiar} onClick={() => { setQuery(''); setResultados(todos); setError('') }}>
                ✕
              </button>
            )}
          </div>

          {error && <p style={s.error}>{error}</p>}

          {!error && lista.length === 0 && !loading && (
            <p style={s.vacio}>No hay kinesiólogos registrados.</p>
          )}

          {lista.length > 0 && (
            <div style={s.tabla}>
              <div style={s.thead}>
                <span style={s.th}>Nombre</span>
                <span style={s.th}>Apellido</span>
                <span style={s.th}>DNI</span>
                <span style={s.th}>Email</span>
                <span style={{ ...s.th, textAlign: 'center' }}>Clases activas</span>
              </div>
              {lista.map(k => (
                <div key={k.id} style={s.fila}>
                  <span style={s.td}>{k.nombre}</span>
                  <span style={s.td}>{k.apellido}</span>
                  <span style={s.td}>{k.dni}</span>
                  <span style={{ ...s.td, color: '#555' }}>{k.email}</span>
                  <span style={{ ...s.td, textAlign: 'center' }}>
                    <span style={{ ...s.badge, background: k.cantidad_clases > 0 ? '#e8f5e9' : '#f5f5f5', color: k.cantidad_clases > 0 ? '#2d6a2d' : '#aaa' }}>
                      {k.cantidad_clases}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

const s = {
  contenedor:  { display: 'flex', flexDirection: 'column', gap: 12 },
  btnVer:      { alignSelf: 'flex-start', padding: '9px 20px', borderRadius: 8, border: '1px solid #2d6a2d', background: 'transparent', color: '#2d6a2d', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  buscadorRow: { display: 'flex', gap: 8 },
  input:       { flex: 1, padding: '9px 14px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, outline: 'none' },
  btnBuscar:   { padding: '9px 20px', borderRadius: 8, border: 'none', background: '#2d6a2d', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnLimpiar:  { padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', background: 'transparent', fontSize: 13, cursor: 'pointer', color: '#888' },
  error:       { fontSize: 13, color: '#c0392b', background: '#fdf0f0', padding: '8px 12px', borderRadius: 8, margin: 0 },
  vacio:       { fontSize: 13, color: '#aaa', margin: 0 },
  tabla:       { display: 'flex', flexDirection: 'column', borderRadius: 10, border: '1px solid #e5e5e5', overflow: 'hidden' },
  thead:       { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr 100px', background: '#f5f6f7', padding: '8px 16px', gap: 8 },
  fila:        { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr 100px', padding: '10px 16px', gap: 8, borderTop: '1px solid #f0f0f0', background: '#fff' },
  th:          { fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  td:          { fontSize: 13, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  badge:       { fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 20 },
}