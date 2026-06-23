import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const API = 'http://localhost:8000/api'

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
      setError('Por favor, ingrese un nombre o DNI para buscar.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`, {
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

  return (
    <div style={s.contenedor}>
      <div style={s.buscadorRow}>
        <input
          style={s.input}
          placeholder="Buscar por nombre o DNI..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && buscar()}
        />
        <button style={s.btnBuscar} onClick={buscar} disabled={loading}>
          {loading ? 'Buscando...' : 'Buscar Cliente'}
        </button>
      </div>

      {error && <p style={s.error}>{error}</p>}

      {resultados && (
        <div style={s.listado}>
          {resultados.map(c => (
            <div key={c.id} style={s.card}>
              <div style={s.cardHeader}>
                <span style={s.cardNombre}>{c.nombre} {c.apellido}</span>
                {c.suspendido && <span style={s.badgeSuspendido}>Suspendido</span>}
                {c.es_abonado && <span style={s.badgeAbonado}>Abonado</span>}
              </div>
              <p style={s.cardDato}>DNI: {c.dni}</p>
              <p style={s.cardDato}>Email: {c.email}</p>
              {c.telefono && <p style={s.cardDato}>Tel: {c.telefono}</p>}
              <p style={s.cardDato}>Cancelaciones: {c.cant_cancelaciones}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const s = {
  contenedor: { display: 'flex', flexDirection: 'column', gap: 12 },
  buscadorRow: { display: 'flex', gap: 8 },
  input: {
    flex: 1, padding: '9px 14px', borderRadius: 8, border: '1px solid #ddd',
    fontSize: 14, outline: 'none',
  },
  btnBuscar: {
    padding: '9px 20px', borderRadius: 8, border: 'none',
    background: '#2d6a2d', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  error: {
    fontSize: 13, color: '#c0392b', margin: 0, background: '#fdf0f0',
    padding: '8px 12px', borderRadius: 8,
  },
  listado: { display: 'flex', flexDirection: 'column', gap: 8 },
  card: {
    background: '#fff', border: '1px solid #e5e5e5', borderRadius: 10,
    padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4,
  },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 8 },
  cardNombre: { fontSize: 15, fontWeight: 700, color: '#1a1a1a' },
  cardDato: { fontSize: 13, color: '#555', margin: 0 },
  badgeSuspendido: {
    fontSize: 11, fontWeight: 600, background: '#fdf0f0', color: '#c0392b',
    padding: '2px 8px', borderRadius: 20,
  },
  badgeAbonado: {
    fontSize: 11, fontWeight: 600, background: '#e8f5e9', color: '#2d6a2d',
    padding: '2px 8px', borderRadius: 20,
  },
}