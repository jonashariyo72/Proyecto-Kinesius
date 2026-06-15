import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Clases from '../components/Clases'
import Clientes from '../components/Clientes'

const API = 'http://localhost:8000/api'

export default function AdminPage() {
  const { logout, access } = useAuth()
  const navigate          = useNavigate()

  const [confirmarLogout, setConfirmarLogout] = useState(false)
  const [verClientes, setVerClientes]         = useState(false)
  const [precio, setPrecio]                   = useState(15000)
  const [inputPrecio, setInputPrecio]         = useState(15000)
  const [editandoPrecio, setEditandoPrecio]   = useState(false)

  const [refreshKines, setRefreshKines] = useState(0)

  // Modal baja usuario
  const [modalBaja, setModalBaja] = useState(false)
  const [bajaDni, setBajaDni]     = useState('')
  const [bajaError, setBajaError] = useState('')
  const [bajaOk, setBajaOk]       = useState('')
  const [bajaLoading, setBajaLoading] = useState(false)

  // Modal registro kine
  const [modalKine, setModalKine] = useState(false)
  const [kineForm, setKineForm]   = useState({ nombre: '', apellido: '', dni: '', email: '' })
  const [kineError, setKineError] = useState('')
  const [kineOk, setKineOk]       = useState('')
  const [kineLoading, setKineLoading] = useState(false)

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

  const abrirModalBaja = () => {
    setBajaDni('')
    setBajaError('')
    setBajaOk('')
    setModalBaja(true)
  }

  const handleBaja = async () => {
    setBajaError('')
    setBajaOk('')
    setBajaLoading(true)

    try {
      const res = await fetch(`${API}/usuarios/baja-usuario/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access}`,
        },
        body: JSON.stringify({ dni: bajaDni }),
      })

      const data = await res.json()

      if (res.ok) {
        setBajaOk(data.mensaje)
        setBajaDni('')
        setRefreshKines(n => n + 1)
      } else {
        setBajaError(data.error ?? 'Error al dar de baja.')
      }
    } catch {
      setBajaError('No se pudo conectar con el servidor.')
    } finally {
      setBajaLoading(false)
    }
  }

  const abrirModalKine = () => {
    setKineForm({ nombre: '', apellido: '', dni: '', email: '' })
    setKineError('')
    setKineOk('')
    setModalKine(true)
  }

  const handleRegistrarKine = async () => {
    setKineError('')
    setKineOk('')
    setKineLoading(true)

    try {
      const res = await fetch(`${API}/usuarios/registro/kinesiologo/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access}`,
        },
        body: JSON.stringify(kineForm),
      })

      const data = await res.json()

      if (res.ok) {
        setKineOk('Usuario de kinesiólogo creado exitosamente')
        setKineForm({ nombre: '', apellido: '', dni: '', email: '' })
        setRefreshKines(n => n + 1)
      } else {
        // Tomar el primer mensaje de error que devuelva Django
        const primerError = Object.values(data).flat()[0] ?? 'Error al registrar el kinesiólogo.'
        setKineError(primerError)
      }
    } catch {
      setKineError('No se pudo conectar con el servidor.')
    } finally {
      setKineLoading(false)
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

          <button style={s.btnRegistrarKine} onClick={abrirModalKine}>
            + Registrar kinesiólogo
          </button>

          <button style={s.btnBaja} onClick={abrirModalBaja}>
            Dar de baja usuario
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
                <button style={s.btnCancelarPrecio} onClick={() => setEditandoPrecio(false)}>
                  Cancelar
                </button>
                <button style={s.btnConfirmarVerde} onClick={confirmarPrecio}>
                  Confirmar
                </button>
              </>
            )}
          </div>
        </div>

        <Clases precioPorDefecto={precio} refreshKines={refreshKines} />
      </main>

      {/* ── Modal logout ── */}
      {confirmarLogout && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={s.modalTitulo}>¿Cerrar sesión?</h3>
            <p style={s.modalTexto}>¿Estás seguro que querés cerrar la sesión?</p>
            <div style={s.botonesRow}>
              <button style={s.btnCancelar} onClick={() => setConfirmarLogout(false)}>
                Cancelar
              </button>
              <button style={s.btnConfirmarVerde} onClick={handleLogout}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal registrar kinesiólogo ── */}
      {modalKine && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={s.modalTitulo}>Registrar kinesiólogo</h3>

            <div style={s.formGroup}>
              <label style={s.label}>Nombre</label>
              <input
                style={s.input}
                placeholder="José"
                value={kineForm.nombre}
                onChange={e => setKineForm(f => ({ ...f, nombre: e.target.value }))}
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Apellido</label>
              <input
                style={s.input}
                placeholder="Martínez"
                value={kineForm.apellido}
                onChange={e => setKineForm(f => ({ ...f, apellido: e.target.value }))}
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>DNI</label>
              <input
                style={s.input}
                placeholder="45913234"
                value={kineForm.dni}
                onChange={e => setKineForm(f => ({ ...f, dni: e.target.value }))}
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Email</label>
              <input
                style={s.input}
                placeholder="pepe123@kinescius.com"
                value={kineForm.email}
                onChange={e => setKineForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>

            {kineError && <p style={s.error}>{kineError}</p>}
            {kineOk    && <p style={s.ok}>{kineOk}</p>}

            <div style={s.botonesRow}>
              <button
                style={s.btnCancelar}
                onClick={() => setModalKine(false)}
                disabled={kineLoading}
              >
                Cancelar
              </button>
              <button
                style={{ ...s.btnConfirmarVerde, opacity: kineLoading ? 0.7 : 1 }}
                onClick={handleRegistrarKine}
                disabled={kineLoading}
              >
                {kineLoading ? 'Registrando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Modal dar de baja ── */}
      {modalBaja && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={s.modalTitulo}>Dar de baja usuario</h3>
            <p style={s.modalTexto}>Ingresá el DNI del cliente o kinesiólogo que querés dar de baja.</p>

            <div style={s.formGroup}>
              <label style={s.label}>DNI</label>
              <input
                style={s.input}
                placeholder="45913234"
                value={bajaDni}
                onChange={e => setBajaDni(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleBaja()}
              />
            </div>

            {bajaError && <p style={s.error}>{bajaError}</p>}
            {bajaOk    && <p style={s.ok}>{bajaOk}</p>}

            <div style={s.botonesRow}>
              <button
                style={s.btnCancelar}
                onClick={() => setModalBaja(false)}
                disabled={bajaLoading}
              >
                Cancelar
              </button>
              <button
                style={{ ...s.btnBajaConfirmar, opacity: bajaLoading ? 0.7 : 1 }}
                onClick={handleBaja}
                disabled={bajaLoading}
              >
                {bajaLoading ? 'Procesando...' : 'Dar de baja'}
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

  main:     { padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  btnRow:   { display: 'flex', gap: 10 },

  btnToggle:       { padding: '9px 20px', borderRadius: 8, border: '1px solid #2d6a2d', background: 'transparent', color: '#2d6a2d', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnToggleActive: { background: '#2d6a2d', color: '#fff' },

  btnRegistrarKine: {
    padding: '9px 20px', borderRadius: 8, border: 'none',
    background: '#2d6a2d', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },

  btnBaja: {
    padding: '9px 20px', borderRadius: 8, border: '1px solid #c0392b',
    background: 'transparent', color: '#c0392b', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },

  btnBajaConfirmar: {
    flex: 1, padding: '10px', borderRadius: 8, border: 'none',
    background: '#c0392b', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },

  panelPrecio: { background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: '1rem 1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  panelPrecioLeft:  { display: 'flex', flexDirection: 'column', gap: 4 },
  panelPrecioLabel: { fontSize: 12, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  panelPrecioValor: { fontSize: 22, fontWeight: 700, color: '#c8a000' },
  panelPrecioInput: { fontSize: 20, fontWeight: 700, color: '#c8a000', border: '1px solid #ddd', borderRadius: 8, padding: '4px 10px', width: 140, outline: 'none' },
  panelPrecioRight: { display: 'flex', gap: 8 },
  btnModificar:     { padding: '8px 16px', borderRadius: 8, border: '1px solid #c8a000', background: 'transparent', color: '#c8a000', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnCancelarPrecio:{ padding: '8px 14px', borderRadius: 8, border: '1px solid #ddd', background: 'transparent', fontSize: 13, cursor: 'pointer', color: '#555' },

  overlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal:    { background: '#fff', borderRadius: 14, padding: '2rem', width: '90%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 14 },
  modalTitulo: { fontSize: 17, fontWeight: 700, color: '#1a1a1a', margin: 0 },
  modalTexto:  { fontSize: 14, color: '#555', margin: 0 },
  botonesRow:  { display: 'flex', gap: 10, marginTop: 4 },
  btnCancelar: { flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', fontSize: 14, cursor: 'pointer', color: '#555' },
  btnConfirmarVerde: { flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#2d6a2d', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },

  formGroup: { display: 'flex', flexDirection: 'column', gap: 4 },
  label:     { fontSize: 12, fontWeight: 600, color: '#555' },
  input:     { padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, outline: 'none' },
  error:     { fontSize: 13, color: '#c0392b', margin: 0, background: '#fdf0f0', padding: '8px 12px', borderRadius: 8 },
  ok:        { fontSize: 13, color: '#2d6a2d', margin: 0, background: '#e8f5e9', padding: '8px 12px', borderRadius: 8 },
}