import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Clases from '../components/Clases'
import Clientes from '../components/Clientes'

export default function AdminPage() {
  const { logout } = useAuth()
  const navigate   = useNavigate()
  const [confirmarLogout, setConfirmarLogout] = useState(false)
  const [verClientes, setVerClientes] = useState(false)
  const [precio, setPrecio]           = useState(15000)
  const [inputPrecio, setInputPrecio] = useState(15000)
  const [editandoPrecio, setEditandoPrecio] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const confirmarPrecio = () => {
    const nuevo = parseInt(inputPrecio)
    if (!isNaN(nuevo) && nuevo > 0) {
      setPrecio(nuevo)
      setEditandoPrecio(false)
    }
  }

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.logoWrap}>
          <span style={s.logoK}>K</span>
          <span style={s.logoRest}>INESCIUS</span>
          <span style={s.badge}>Administrador</span>
        </div>
        <button style={s.btnLogout} onClick={() => setConfirmarLogout(true)}>
          Cerrar sesión
        </button>
      </header>

      <main style={s.main}>
        <div style={s.btnRow}>
          <button
            style={{ ...s.btnToggle, ...(verClientes ? s.btnToggleActive : {}) }}
            onClick={() => setVerClientes(v => !v)}
          >
            {verClientes ? 'Ocultar clientes' : 'Ver clientes registrados'}
          </button>
        </div>

        {verClientes && <Clientes />}

        {/* ── Panel precio ── */}
        <div style={s.panelPrecio}>
          <div style={s.panelPrecioLeft}>
            <span style={s.panelPrecioLabel}>Precio de nuevas clases</span>
            {!editandoPrecio ? (
              <span style={s.panelPrecioValor}>
                $ {precio.toLocaleString('es-AR')}
              </span>
            ) : (
              <input
                style={s.panelPrecioInput}
                type="number"
                min={1}
                value={inputPrecio}
                onChange={e => setInputPrecio(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && confirmarPrecio()}
                autoFocus
              />
            )}
          </div>

          <div style={s.panelPrecioRight}>
            {!editandoPrecio ? (
              <button
                style={s.btnModificar}
                onClick={() => {
                  setInputPrecio(precio)
                  setEditandoPrecio(true)
                }}
              >
                Modificar precio
              </button>
            ) : (
              <>
                <button
                  style={s.btnCancelarPrecio}
                  onClick={() => setEditandoPrecio(false)}
                >
                  Cancelar
                </button>
                <button
                  style={s.btnConfirmar}
                  onClick={confirmarPrecio}
                >
                  Confirmar
                </button>
              </>
            )}
          </div>
        </div>

        <Clases precioPorDefecto={precio} />
      </main>

      {/* Modal de confirmación */}
      {confirmarLogout && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={s.modalTitulo}>¿Cerrar sesión?</h3>
            <p style={s.modalTexto}>¿Estás seguro que querés cerrar la sesión?</p>
            <div style={s.botonesRow}>
              <button style={s.btnCancelar} onClick={() => setConfirmarLogout(false)}>
                Cancelar
              </button>
              <button style={s.btnConfirmar} onClick={handleLogout}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  page:     { minHeight: '100vh', background: '#f5f6f7' },
  header:   { background: '#fff', borderBottom: '1px solid #e5e5e5', padding: '0 2rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 4 },
  logoK:    { fontSize: 22, fontWeight: 700, color: '#2d6a2d' },
  logoRest: { fontSize: 22, fontWeight: 700, color: '#1a1a1a', letterSpacing: 1 },
  badge:    { marginLeft: 12, fontSize: 11, fontWeight: 600, background: '#e8f5e9', color: '#2d6a2d', padding: '3px 10px', borderRadius: 20 },
  btnLogout:{ padding: '7px 16px', borderRadius: 8, border: '1px solid #ddd', background: 'transparent', fontSize: 13, cursor: 'pointer', color: '#555' },
  main:     { padding: '1.5rem' },
  overlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal:    { background: '#fff', borderRadius: 14, padding: '2rem', width: '90%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 16 },
  modalTitulo: { fontSize: 17, fontWeight: 700, color: '#1a1a1a', margin: 0 },
  modalTexto:  { fontSize: 14, color: '#555', margin: 0 },
  botonesRow:  { display: 'flex', gap: 10 },
  btnCancelar: { flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', fontSize: 14, cursor: 'pointer', color: '#555' },
  btnConfirmar:{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#2d6a2d', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  page:            { minHeight: '100vh', background: '#f5f6f7' },
  header:          { background: '#fff', borderBottom: '1px solid #e5e5e5', padding: '0 2rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logoWrap:        { display: 'flex', alignItems: 'center', gap: 4 },
  logoK:           { fontSize: 22, fontWeight: 700, color: '#2d6a2d' },
  logoRest:        { fontSize: 22, fontWeight: 700, color: '#1a1a1a', letterSpacing: 1 },
  badge:           { marginLeft: 12, fontSize: 11, fontWeight: 600, background: '#e8f5e9', color: '#2d6a2d', padding: '3px 10px', borderRadius: 20 },
  btnLogout:       { padding: '7px 16px', borderRadius: 8, border: '1px solid #ddd', background: 'transparent', fontSize: 13, cursor: 'pointer', color: '#555' },
  main:            { padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  btnRow:          { display: 'flex' },
  btnToggle:       { padding: '9px 20px', borderRadius: 8, border: '1px solid #2d6a2d', background: 'transparent', color: '#2d6a2d', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnToggleActive: { background: '#2d6a2d', color: '#fff' },

  panelPrecio: {
    background: '#fff',
    border: '1px solid #e5e5e5',
    borderRadius: 12,
    padding: '1rem 1.4rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  panelPrecioLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  panelPrecioLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  panelPrecioValor: {
    fontSize: 22,
    fontWeight: 700,
    color: '#c8a000',
  },
  panelPrecioInput: {
    fontSize: 20,
    fontWeight: 700,
    color: '#c8a000',
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: '4px 10px',
    width: 140,
    outline: 'none',
  },
  panelPrecioRight: {
    display: 'flex',
    gap: 8,
  },
  btnModificar: {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid #c8a000',
    background: 'transparent',
    color: '#c8a000',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnCancelarPrecio: {
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid #ddd',
    background: 'transparent',
    fontSize: 13,
    cursor: 'pointer',
    color: '#555',
  },
  btnConfirmar: {
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    background: '#c8a000',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
}