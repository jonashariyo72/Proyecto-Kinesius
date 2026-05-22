import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/clasesService'
import { Link } from "react-router-dom";

const DIAS = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes',
}
const TIPOS = {
  tren_inferior: 'Tren Inferior',
  zona_media: 'Zona Media',
  tren_superior: 'Tren Superior',
}

// ─── Íconos simples SVG ───────────────────────────────────────────────────────
const IconCalendar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)
const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)
const IconList = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
)

// ─── Modal de pago ─────────────────────────────────────────────────────────────
function ModalPago({ clase, onConfirmar, onCerrar }) {
  const [metodo, setMetodo] = useState('MERCADOPAGO')
  const [tipoPago, setTipoPago] = useState('SENIA')
  const [procesando, setProcesando] = useState(false)
  const precio = parseFloat(clase.precio)
  const montoPagar = tipoPago === 'SENIA' ? precio * 0.5 : precio

  const handlePagar = async () => {
    setProcesando(true)
    await onConfirmar(clase.id, tipoPago, metodo)
    setProcesando(false)
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitulo}>Confirmar reserva</h3>
          <button style={s.btnX} onClick={onCerrar}>✕</button>
        </div>

        <div style={s.modalClaseInfo}>
          <span style={s.badgeTipo}>{TIPOS[clase.tipo]}</span>
          <p style={s.modalDia}>{DIAS[clase.dia]} — {clase.hora_inicio?.slice(0,5)} hs</p>
          {clase.kinesiologo_nombre && (
            <p style={s.modalKine}>👤 {clase.kinesiologo_nombre}</p>
          )}
        </div>

        <div style={s.seccion}>
          <p style={s.seccionLabel}>Tipo de pago</p>
          <div style={s.opcionesRow}>
            {[
              { value: 'SENIA', label: `Seña 50% — $${(precio * 0.5).toLocaleString('es-AR')}` },
              { value: 'TOTAL', label: `Total — $${precio.toLocaleString('es-AR')}` },
            ].map(op => (
              <button
                key={op.value}
                style={{ ...s.opcionBtn, ...(tipoPago === op.value ? s.opcionActiva : {}) }}
                onClick={() => setTipoPago(op.value)}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>

        <div style={s.seccion}>
          <p style={s.seccionLabel}>Método de pago</p>
          <div style={s.opcionesRow}>
            {[
              { value: 'MERCADOPAGO', label: '🔵 Mercado Pago' },
              { value: 'TARJETA',     label: '💳 Tarjeta' },
            ].map(op => (
              <button
                key={op.value}
                style={{ ...s.opcionBtn, ...(metodo === op.value ? s.opcionActiva : {}) }}
                onClick={() => setMetodo(op.value)}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>

        <div style={s.totalRow}>
          <span style={s.totalLabel}>Total a pagar</span>
          <span style={s.totalMonto}>${montoPagar.toLocaleString('es-AR')}</span>
        </div>

        <button
          style={{ ...s.btnVerde, width: '100%', opacity: procesando ? 0.7 : 1 }}
          onClick={handlePagar}
          disabled={procesando}
        >
          {procesando ? 'Procesando...' : 'Confirmar y pagar'}
        </button>
      </div>
    </div>
  )
}

// ─── Modal cancelar ────────────────────────────────────────────────────────────
function ModalCancelar({ reserva, onConfirmar, onCerrar }) {
  const [procesando, setProcesando] = useState(false)

  const handleCancelar = async () => {
    setProcesando(true)
    await onConfirmar(reserva.id)
    setProcesando(false)
  }

  const ahora = new Date()
  const fechaReserva = new Date(reserva.fecha_reserva)
  const diffHoras = (fechaReserva - ahora) / (1000 * 60 * 60)
  const esMas24 = diffHoras > 24

  const precio = parseFloat(reserva.clase_precio || 0)
  let devolucion = 0
  if (esMas24) devolucion = precio
  else if (reserva.tipo_pago === 'TOTAL') devolucion = precio * 0.5

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitulo}>Cancelar reserva</h3>
          <button style={s.btnX} onClick={onCerrar}>✕</button>
        </div>

        <div style={s.avisoAmarillo}>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
            {esMas24
              ? '✅ Cancelás con más de 24 hs de anticipación. Se te devuelve el monto completo.'
              : reserva.tipo_pago === 'TOTAL'
                ? '⚠️ Cancelás con menos de 24 hs. Se te devuelve el 50% del monto pagado.'
                : '❌ Cancelás con menos de 24 hs habiendo pagado seña. No hay devolución.'
            }
          </p>
          {devolucion > 0 && (
            <p style={{ margin: '8px 0 0', fontWeight: 700, fontSize: 14 }}>
              Devolución: ${devolucion.toLocaleString('es-AR')}
            </p>
          )}
        </div>

        <div style={s.botonesRow}>
          <button style={s.btnGris} onClick={onCerrar}>Volver</button>
          <button
            style={{ ...s.btnRojo, opacity: procesando ? 0.7 : 1 }}
            onClick={handleCancelar}
            disabled={procesando}
          >
            {procesando ? 'Cancelando...' : 'Confirmar cancelación'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal lista de espera ─────────────────────────────────────────────────────
function ModalListaEspera({ clase, pacienteId, onCerrar }) {
  const [procesando, setProcesando] = useState(false)
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')

  const inscribirse = async () => {
    setProcesando(true)
    setError('')
    try {
      const res = await api.post('/reservas/espera/inscribirse/', {
        paciente: pacienteId,
        clase: clase.id,
      })
      setOk(res.data.mensaje)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo completar la inscripción.')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitulo}>Sin cupos disponibles</h3>
          <button style={s.btnX} onClick={onCerrar}>✕</button>
        </div>
        <div style={s.modalClaseInfo}>
          <span style={s.badgeTipo}>{TIPOS[clase.tipo]}</span>
          <p style={s.modalDia}>{DIAS[clase.dia]} — {clase.hora_inicio?.slice(0,5)} hs</p>
        </div>
        <p style={{ color: '#555', fontSize: 14, lineHeight: 1.6 }}>
          Esta clase no tiene cupos disponibles. Podés anotarte a la lista de espera
          y te avisaremos por mail cuando se libere un lugar. Tendrás 2 horas para confirmar.
        </p>
        {ok    && <p style={s.msgOk}>{ok}</p>}
        {error && <p style={s.msgError}>{error}</p>}
        {!ok && (
          <button
            style={{ ...s.btnVerde, width: '100%', opacity: procesando ? 0.7 : 1 }}
            onClick={inscribirse}
            disabled={procesando}
          >
            {procesando ? 'Procesando...' : 'Anotarme a lista de espera'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────
export default function ClientePage() {
  const { logout } = useAuth()
  const navigate   = useNavigate()

  const [seccion, setSeccion]         = useState('clases')
  const [clases, setClases]           = useState([])
  const [misReservas, setMisReservas] = useState([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [modalPago, setModalPago]     = useState(null)   // clase seleccionada
  const [modalCancelar, setModalCancelar] = useState(null) // reserva seleccionada
  const [modalEspera, setModalEspera] = useState(null)   // clase sin cupo
  const [pacienteId, setPacienteId]   = useState(null)
  const [toast, setToast]             = useState('')

  const mostrarToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  // Obtener ID del paciente desde el token / perfil
  useEffect(() => {
    api.get('/usuarios/perfil/')
      .then(res => setPacienteId(res.data.id))
      .catch(() => {})
  }, [])

  // Cargar clases disponibles
  const cargarClases = async () => {
    setLoading(true); setError('')
    try {
      const res = await api.get('/clases/')
      setClases(Array.isArray(res.data) ? res.data : res.data.results ?? [])
    } catch {
      setError('No se pudieron cargar las clases.')
    } finally {
      setLoading(false)
    }
  }

  // Cargar mis reservas
  const cargarReservas = async () => {
    if (!pacienteId) return
    setLoading(true); setError('')
    try {
      const res = await api.get(`/reservas/gestion/mis-turnos/${pacienteId}/`)
      setMisReservas(Array.isArray(res.data) ? res.data : [])
    } catch {
      setError('No se pudieron cargar tus reservas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (seccion === 'clases')  cargarClases()
    if (seccion === 'turnos')  cargarReservas()
  }, [seccion, pacienteId])

  // Confirmar reserva + pago
  const confirmarReserva = async (claseId, tipoPago, metodo) => {
    try {
      await api.post('/reservas/gestion/', {
        paciente: pacienteId,
        clase: claseId,
        tipo_pago: tipoPago,
        metodo_pago: metodo,
        estado: 'CONFIRMADA',
      })
      setModalPago(null)
      mostrarToast('✅ Reserva confirmada correctamente.')
      cargarClases()
    } catch (err) {
      const msg = err.response?.data?.non_field_errors?.[0]
        || err.response?.data?.detail
        || 'Error al reservar.'
      mostrarToast(`❌ ${msg}`)
      setModalPago(null)
    }
  }

  // Cancelar reserva
  const confirmarCancelacion = async (reservaId) => {
    try {
      await api.post(`/reservas/gestion/${reservaId}/cancelar_reserva/`)
      setModalCancelar(null)
      mostrarToast('Reserva cancelada. El saldo a favor fue registrado.')
      cargarReservas()
    } catch {
      mostrarToast('❌ No se pudo cancelar la reserva.')
      setModalCancelar(null)
    }
  }

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div style={s.page}>

      {/* ── Header ── */}
      <header style={s.header}>
        <div style={s.logoWrap}>
          <span style={s.logoK}>K</span>
          <span style={s.logoRest}>INESCIUS</span>
          <span style={s.badgeRol}>Cliente</span>
        </div>

        <nav style={s.nav}>
          <button
           style={{ ...s.navBtn, ...(seccion === 'clases' ? s.navActivo : {}) }}
           onClick={() => setSeccion('clases')}
          >
           <IconCalendar /> Clases
         </button>

         <button
            style={{ ...s.navBtn, ...(seccion === 'turnos' ? s.navActivo : {}) }}
            onClick={() => setSeccion('turnos')}
          >
            <IconList /> Mis turnos
          </button>

          <Link
            to="/cambiar-password"
            style={s.navBtn}
          >
            Cambiar contraseña
          </Link>
        </nav>

       <button
          style={s.btnLogout}
        onClick={handleLogout}
        >
          Cerrar sesión
        </button>
      </header>

      <main style={s.main}>

        {/* ── Toast ── */}
        {toast && <div style={s.toast}>{toast}</div>}

        {loading && <p style={s.estado}>Cargando...</p>}
        {error   && <p style={s.errorTxt}>{error}</p>}

        {/* ══ SECCIÓN: CLASES DISPONIBLES ══ */}
        {seccion === 'clases' && !loading && !error && (
          <>
            <div style={s.seccionHeader}>
              <h1 style={s.titulo}>Clases disponibles</h1>
              <p style={s.sub}>{clases.length} clase{clases.length !== 1 ? 's' : ''} esta semana</p>
            </div>

            {clases.length === 0 && (
              <p style={s.estado}>No hay clases disponibles por el momento.</p>
            )}

            <div style={s.grid}>
              {clases.map(c => (
                <div key={c.id} style={{ ...s.card, opacity: c.activa ? 1 : 0.5 }}>
                  <div style={s.cardTop}>
                    <span style={s.badgeTipo}>{TIPOS[c.tipo] ?? c.tipo}</span>
                    <span style={{ ...s.cupoTag, color: c.tiene_cupo ? '#2d6a2d' : '#c0392b' }}>
                      {c.tiene_cupo
                        ? `${c.cupos_disponibles} cupo${c.cupos_disponibles !== 1 ? 's' : ''}`
                        : 'Sin cupo'}
                    </span>
                  </div>

                  <div style={s.cardMid}>
                    <span style={s.diaTag}>{DIAS[c.dia] ?? c.dia}</span>
                    <span style={s.horaTag}>{c.hora_inicio?.slice(0,5)} hs</span>
                  </div>

                  {c.kinesiologo_nombre && (
                    <p style={s.infoRow}><IconUser /> {c.kinesiologo_nombre}</p>
                  )}
                  {c.sala && (
                    <p style={s.infoRow}>🚪 Sala {c.sala}</p>
                  )}

                  <p style={s.precioTag}>
                    ${parseFloat(c.precio).toLocaleString('es-AR')}
                  </p>

                  {c.activa && (
                    <button
                      style={{
                        ...s.btnReservar,
                        ...(c.tiene_cupo ? {} : s.btnEspera)
                      }}
                      onClick={() => c.tiene_cupo
                        ? setModalPago(c)
                        : setModalEspera(c)
                      }
                    >
                      {c.tiene_cupo ? 'Reservar' : 'Anotarme a lista de espera'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ══ SECCIÓN: MIS TURNOS ══ */}
        {seccion === 'turnos' && !loading && !error && (
          <>
            <div style={s.seccionHeader}>
              <h1 style={s.titulo}>Mis turnos</h1>
              <p style={s.sub}>{misReservas.length} reserva{misReservas.length !== 1 ? 's' : ''} confirmada{misReservas.length !== 1 ? 's' : ''}</p>
            </div>

            {misReservas.length === 0 && (
              <p style={s.estado}>No tenés turnos confirmados. ¡Reservá una clase!</p>
            )}

            <div style={s.listaReservas}>
              {misReservas.map(r => (
                <div key={r.id} style={s.cardReserva}>
                  <div style={s.reservaLeft}>
                    <span style={s.badgeTipo}>{TIPOS[r.clase_tipo] ?? 'Clase'}</span>
                    <div style={s.reservaInfo}>
                      <span style={s.reservaDia}>
                        <IconCalendar /> {r.clase_dia ? DIAS[r.clase_dia] : '—'}
                      </span>
                      <span style={s.reservaHora}>
                        <IconClock /> {r.clase_hora?.slice(0,5) ?? '—'} hs
                      </span>
                      {r.clase_kinesiologo && (
                        <span style={s.reservaKine}>
                          <IconUser /> {r.clase_kinesiologo}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={s.reservaRight}>
                    <span style={s.estadoBadge}>{r.estado}</span>
                    <button
                      style={s.btnCancelarCard}
                      onClick={() => setModalCancelar(r)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* ── Modales ── */}
      {modalPago && (
        <ModalPago
          clase={modalPago}
          onConfirmar={confirmarReserva}
          onCerrar={() => setModalPago(null)}
        />
      )}
      {modalCancelar && (
        <ModalCancelar
          reserva={modalCancelar}
          onConfirmar={confirmarCancelacion}
          onCerrar={() => setModalCancelar(null)}
        />
      )}
      {modalEspera && (
        <ModalListaEspera
          clase={modalEspera}
          pacienteId={pacienteId}
          onCerrar={() => setModalEspera(null)}
        />
      )}
    </div>
  )
}

// ─── Estilos ───────────────────────────────────────────────────────────────────
const s = {
  page:    { minHeight: '100vh', background: '#f5f6f7', fontFamily: 'sans-serif' },
  header:  {
    background: '#fff', borderBottom: '1px solid #e5e5e5',
    padding: '0 2rem', height: 60,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
  },
  logoWrap:  { display: 'flex', alignItems: 'center', gap: 4 },
  logoK:     { fontSize: 22, fontWeight: 700, color: '#2d6a2d' },
  logoRest:  { fontSize: 22, fontWeight: 700, color: '#1a1a1a', letterSpacing: 1 },
  badgeRol:  {
    marginLeft: 10, fontSize: 11, fontWeight: 600,
    background: '#fffbea', color: '#b8860b',
    padding: '3px 10px', borderRadius: 20, border: '1px solid #f0d060',
  },
  nav:       { display: 'flex', gap: 6 },
  navBtn:    {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 14px', borderRadius: 8,
    border: '1px solid transparent', background: 'transparent',
    fontSize: 13, fontWeight: 500, color: '#555', cursor: 'pointer',
  },
  navActivo: {
    background: '#f0f7f0', color: '#2d6a2d',
    border: '1px solid #c3dfc3',
  },
  btnLogout: {
    padding: '7px 16px', borderRadius: 8,
    border: '1px solid #ddd', background: 'transparent',
    fontSize: 13, cursor: 'pointer', color: '#555',
  },
  main:      { padding: '1.5rem 2rem', maxWidth: 1100, margin: '0 auto' },
  seccionHeader: { marginBottom: '1.2rem' },
  titulo:    { fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: 0 },
  sub:       { fontSize: 13, color: '#888', margin: '4px 0 0' },
  estado:    { textAlign: 'center', color: '#aaa', padding: '3rem', fontSize: 15 },
  errorTxt:  { color: '#c0392b', fontSize: 13 },
  toast:     {
    position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
    background: '#1a1a1a', color: '#fff', padding: '12px 24px',
    borderRadius: 10, fontSize: 14, fontWeight: 500, zIndex: 999,
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
  },
  // Grid de clases
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 16,
  },
  card: {
    background: '#fff', borderRadius: 12,
    border: '1px solid #e5e5e5', padding: '1.2rem',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  cardTop:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  badgeTipo: {
    background: '#e8f5e9', color: '#2d6a2d',
    fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
  },
  cupoTag:   { fontSize: 12, fontWeight: 600 },
  cardMid:   { display: 'flex', gap: 10, alignItems: 'baseline' },
  diaTag:    { fontSize: 15, fontWeight: 600, color: '#333' },
  horaTag:   { fontSize: 20, fontWeight: 700, color: '#2d6a2d' },
  infoRow:   {
    display: 'flex', alignItems: 'center', gap: 5,
    fontSize: 13, color: '#555', margin: 0,
  },
  precioTag: { fontSize: 14, fontWeight: 600, color: '#b8860b', margin: 0 },
  btnReservar: {
    marginTop: 4, padding: '9px', borderRadius: 8,
    border: 'none', background: '#2d6a2d', color: '#fff',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  btnEspera: {
    background: '#fff', color: '#b8860b',
    border: '1px solid #f0d060',
  },
  // Lista de reservas
  listaReservas: { display: 'flex', flexDirection: 'column', gap: 12 },
  cardReserva: {
    background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5',
    padding: '1rem 1.2rem',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
  },
  reservaLeft:  { display: 'flex', alignItems: 'center', gap: 14 },
  reservaInfo:  { display: 'flex', gap: 14, flexWrap: 'wrap' },
  reservaDia:   { display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, color: '#333', fontWeight: 600 },
  reservaHora:  { display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, color: '#2d6a2d', fontWeight: 700 },
  reservaKine:  { display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#555' },
  reservaRight: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  estadoBadge:  {
    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
    background: '#e8f5e9', color: '#2d6a2d',
  },
  btnCancelarCard: {
    padding: '7px 14px', borderRadius: 8,
    border: '1px solid #e74c3c', background: 'transparent',
    color: '#e74c3c', fontSize: 13, cursor: 'pointer',
  },
  // Modales
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
  },
  modal: {
    background: '#fff', borderRadius: 14, padding: '2rem',
    width: '90%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 16,
  },
  modalHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitulo:  { fontSize: 17, fontWeight: 700, color: '#1a1a1a', margin: 0 },
  btnX:         { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#888' },
  modalClaseInfo: { background: '#f9f9f9', borderRadius: 8, padding: '12px 14px' },
  modalDia:     { fontSize: 15, fontWeight: 600, color: '#333', margin: '6px 0 0' },
  modalKine:    { fontSize: 13, color: '#555', margin: '4px 0 0' },
  seccion:      { display: 'flex', flexDirection: 'column', gap: 8 },
  seccionLabel: { fontSize: 13, fontWeight: 600, color: '#555', margin: 0 },
  opcionesRow:  { display: 'flex', gap: 8 },
  opcionBtn: {
    flex: 1, padding: '9px', borderRadius: 8,
    border: '1px solid #ddd', background: '#fff',
    fontSize: 13, cursor: 'pointer', color: '#333',
  },
  opcionActiva: {
    border: '1px solid #2d6a2d', background: '#e8f5e9',
    color: '#2d6a2d', fontWeight: 600,
  },
  totalRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: '#fffbea', borderRadius: 8, padding: '10px 14px',
    border: '1px solid #f0d060',
  },
  totalLabel: { fontSize: 13, fontWeight: 600, color: '#555' },
  totalMonto: { fontSize: 18, fontWeight: 700, color: '#b8860b' },
  btnVerde: {
    padding: '10px 20px', borderRadius: 8, border: 'none',
    background: '#2d6a2d', color: '#fff',
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  avisoAmarillo: {
    background: '#fffbea', border: '1px solid #f0d060',
    borderRadius: 8, padding: '12px 14px',
  },
  botonesRow:  { display: 'flex', gap: 10 },
  btnGris: {
    flex: 1, padding: '10px', borderRadius: 8,
    border: '1px solid #ddd', background: '#fff',
    fontSize: 14, cursor: 'pointer', color: '#555',
  },
  btnRojo: {
    flex: 1, padding: '10px', borderRadius: 8,
    border: 'none', background: '#e74c3c', color: '#fff',
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  msgOk:    { color: '#2d6a2d', fontWeight: 600, fontSize: 14, margin: 0 },
  msgError: { color: '#c0392b', fontSize: 13, margin: 0 },
}