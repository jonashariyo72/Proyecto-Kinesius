import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

export default function BuscarCliente({ modo = 'admin' }) {
  const { access } = useAuth()

  const [query, setQuery]           = useState('')
  const [resultados, setResultados] = useState(null)
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)

  const endpoint = modo === 'kinesiologo'
    ? `${API}/usuarios/buscar-cliente-kinesiologo/`
    : `${API}/usuarios/buscar-cliente/`

  const buscar = async () => {
    setError('')
    setResultados(null)

    if (!query.trim()) {
      setError('Por favor, ingrese un nombre, apellido o DNI para buscar.')
      return
    }

    setLoading(true)
    try {
      const res  = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${access}` },
      })
      const data = await res.json()

      if (res.ok) {
        setResultados(data)
      } else {
        setError(data.error ?? 'Error al buscar.')
      }
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  const lista = resultados ?? []

  return (
    <div style={s.contenedor}>
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
          <button style={s.btnLimpiar} onClick={() => { setQuery(''); setResultados(null); setError('') }}>
            ✕
          </button>
        )}
      </div>

      {error && <p style={s.error}>{error}</p>}

      {resultados && lista.length === 0 && (
        <p style={s.vacio}>No hay coincidencias.</p>
      )}

      {lista.length > 0 && (
        <div style={s.tabla}>
          <div style={s.thead}>
            <span style={s.th}>Nombre</span>
            <span style={s.th}>Apellido</span>
            <span style={s.th}>DNI</span>
            <span style={s.th}>Email</span>
            <span style={{ ...s.th, textAlign: 'center' }}>Estado</span>
          </div>
          {lista.map(c => (
            <div key={c.id} style={s.fila}>
              <span style={s.td}>{c.nombre}</span>
              <span style={s.td}>{c.apellido}</span>
              <span style={s.td}>{c.dni}</span>
              <span style={{ ...s.td, color: '#555' }}>{c.email}</span>
              <span style={{ ...s.td, textAlign: 'center' }}>
                {c.suspendido
                  ? <span style={{ ...s.badge, background: '#fdf0f0', color: '#c0392b' }}>Suspendido</span>
                  : c.es_abonado
                    ? <span style={{ ...s.badge, background: '#e8f5e9', color: '#2d6a2d' }}>Abonado</span>
                    : <span style={{ ...s.badge, background: '#f5f5f5', color: '#aaa' }}>No abonado</span>
                }
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const s = {
  contenedor:  { display: 'flex', flexDirection: 'column', gap: 12 },
  buscadorRow: { display: 'flex', gap: 8 },
  input:       { flex: 1, padding: '9px 14px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, outline: 'none' },
  btnBuscar:   { padding: '9px 20px', borderRadius: 8, border: 'none', background: '#2d6a2d', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnLimpiar:  { padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', background: 'transparent', fontSize: 13, cursor: 'pointer', color: '#888' },
  error:       { fontSize: 13, color: '#c0392b', background: '#fdf0f0', padding: '8px 12px', borderRadius: 8, margin: 0 },
  vacio:       { fontSize: 13, color: '#aaa', margin: 0 },
  tabla:       { display: 'flex', flexDirection: 'column', borderRadius: 10, border: '1px solid #e5e5e5', overflow: 'hidden' },
  thead:       { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr 120px', background: '#f5f6f7', padding: '8px 16px', gap: 8 },
  fila:        { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr 120px', padding: '10px 16px', gap: 8, borderTop: '1px solid #f0f0f0', background: '#fff' },
  th:          { fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  td:          { fontSize: 13, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  badge:       { fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20 },
}