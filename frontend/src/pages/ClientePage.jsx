import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/clasesService'
import { Link } from "react-router-dom";
import PagoReservaPage from './PagoReservaPage'

const DIAS = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes',
}

const ORDEN_DIAS = {
  lunes: 1, martes: 2, miercoles: 3, miércoles: 3, jueves: 4, viernes: 5,
}

const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']

function parseFechaLocal(fecha) {
  if (!fecha) return null
  const limpia = fecha.split('T')[0]
  const [year, month, day] = limpia.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatFechaCorta(fecha) {
  const date = parseFechaLocal(fecha)
  if (!date) return ''
  return `${date.getDate()}/${date.getMonth() + 1}`
}

const TIPOS = {
  tren_inferior: 'Tren Inferior',
  zona_media: 'Zona Media',
  tren_superior: 'Tren Superior',
}

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
const IconLock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
)

function ModalCancelar({ reserva, onConfirmar, onCerrar }) {
  const [procesando, setProcesando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [devolucion, setDevolucion] = useState(0)

  const handleCancelar = async () => {
    setProcesando(true)
    await onConfirmar(reserva.id)
    setProcesando(false)
  }

  useEffect(() => {
    async function cargarResumen() {
      try {
        const res = await api.get(`/reservas/gestion/${reserva.id}/resumen_cancelacion/`)
        setMensaje(res.data.mensaje)
        setDevolucion(Number(res.data.devolucion))
      } catch (err) {
        console.error(err)
      }
    }
    cargarResumen()
  }, [reserva.id])

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitulo}>Cancelar reserva</h3>
          <button style={s.btnX} onClick={onCerrar}>✕</button>
        </div>
        <div style={s.avisoAmarillo}>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{mensaje}</p>
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

export default function ClientePage() {
  const { logout } = useAuth()
  const navigate   = useNavigate()

  const [seccion, setSeccion]         = useState('clases')
  const [clases, setClases]           = useState([])
  const [misReservas, setMisReservas] = useState([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [pagoActivo, setPagoActivo]   = useState(null)
  const [modalCancelar, setModalCancelar] = useState(null)
  const [modalEspera, setModalEspera] = useState(null)
  const [pacienteId, setPacienteId]   = useState(null)
  const [toast, setToast]             = useState('')
  const [nombreUsuario, setNombreUsuario] = useState('')
  const [confirmarLogout, setConfirmarLogout] = useState(false)

  // Filtros
  const [filtroTipo, setFiltroTipo]               = useState('')
  const [filtroDia, setFiltroDia]                 = useState('')
  const [filtroKinesiologo, setFiltroKinesiologo] = useState('')
  const [kinesiologos, setKinesiologos]           = useState([])

  const mostrarToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  useEffect(() => {
    api.get('/usuarios/perfil/')
      .then(res => {
        setPacienteId(res.data.id)
        setNombreUsuario(
          res.data.nombre ||
          res.data.usuario?.nombre ||
          res.data.user?.nombre ||
          res.data.cliente?.usuario?.nombre ||
          res.data.email?.split('@')[0] || ''
        )
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    api.get('/usuarios/kinesiologos/')
      .then(res => setKinesiologos(Array.isArray(res.data) ? res.data : res.data.results ?? []))
      .catch(() => {})
  }, [])

  const cargarClases = async () => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams()
      if (filtroDia)         params.append('dia', filtroDia)
      if (filtroTipo)        params.append('tipo', filtroTipo)
      if (filtroKinesiologo) params.append('kinesiologo', filtroKinesiologo)
      const res = await api.get(`/clases/?${params.toString()}`)
      setClases(Array.isArray(res.data) ? res.data : res.data.results ?? [])
    } catch {
      setError('No se pudieron cargar las clases.')
    } finally {
      setLoading(false)
    }
  }

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
    if (seccion === 'clases') cargarClases()
    if (seccion === 'turnos') cargarReservas()
  }, [seccion, pacienteId, filtroDia, filtroTipo, filtroKinesiologo])

  const handleReservar = async (clase) => {
    try {
      const resReserva = await api.post('/reservas/gestion/', {
        paciente: pacienteId,
        clase: clase.id,
      })
      setPagoActivo({
        reservaId:       resReserva.data.id,
        montoTotalClase: parseFloat(clase.precio),
        clase,
      })
    } catch (err) {
      const msg =
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Error al crear la reserva.'
      mostrarToast(`❌ ${msg}`)
    }
  }

  const handlePagoExitoso = () => {
    setPagoActivo(null)
    mostrarToast('✅ Reserva confirmada correctamente.')
    setSeccion('turnos')
    cargarReservas()
  }

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

  const clasesPorDia = DIAS_SEMANA.map(dia => {
    const clasesDelDia = clases
      .filter(c => c.dia === dia)
      .sort((a, b) => {
        const fechaA = parseFechaLocal(a.fecha_clase)
        const fechaB = parseFechaLocal(b.fecha_clase)
        if (fechaA && fechaB && fechaA.getTime() !== fechaB.getTime()) return fechaA - fechaB
        return (a.hora_inicio ?? '').localeCompare(b.hora_inicio ?? '')
      })
    return { dia, nombre: DIAS[dia], clases: clasesDelDia }
  }).filter(grupo => grupo.clases.length > 0)

  if (pagoActivo) {
    return (
      <PagoReservaPage
        reservaId={pagoActivo.reservaId}
        montoTotalClase={pagoActivo.montoTotalClase}
        clase={pagoActivo.clase}
        pacienteId={pacienteId}
        onRecrearReserva={async () => {
          if (!pagoActivo.clase?.id) throw new Error('No se pudo recuperar la clase.')
          const resReserva = await api.post('/reservas/gestion/', {
            paciente: pacienteId,
            clase: pagoActivo.clase.id,
          })
          setPagoActivo(prev => ({ ...prev, reservaId: resReserva.data.id }))
          return resReserva.data.id
        }}
        onPagoExitoso={handlePagoExitoso}
        onCancelar={() => setPagoActivo(null)}
      />
    )
  }

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.logoWrap}>
          <span style={s.logoK}>K</span>
          <span style={s.logoRest}>INESCIUS</span>
          <span style={s.badgeRol}>
            {nombreUsuario ? `Hola, ${nombreUsuario}` : 'Hola'}
          </span>
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
          <Link to="/cambiar-password" style={s.navBtn}>
            <IconLock /> Cambiar contraseña
          </Link>
        </nav>
        <button style={s.btnLogout} onClick={() => setConfirmarLogout(true)}>
          Cerrar sesión
        </button>
      </header>

      <main style={s.main}>
        {toast && <div style={s.toast}>{toast}</div>}
        {loading && <p style={s.estado}>Cargando...</p>}
        {error   && <p style={s.errorTxt}>{error}</p>}

        {seccion === 'clases' && !loading && !error && (
          <>
            <div style={s.seccionHeader}>
              <h1 style={s.titulo}>Clases disponibles</h1>
              <p style={s.sub}>{clases.length} clase{clases.length !== 1 ? 's' : ''} esta semana</p>
            </div>

            {/* ── Filtros ── */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <select style={s.filtroSelect} value={filtroDia} onChange={e => setFiltroDia(e.target.value)}>
                <option value="">Todos los días</option>
                <option value="lunes">Lunes</option>
                <option value="martes">Martes</option>
                <option value="miercoles">Miércoles</option>
                <option value="jueves">Jueves</option>
                <option value="viernes">Viernes</option>
              </select>
              <select style={s.filtroSelect} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                <option value="">Todos los tipos</option>
                <option value="tren_inferior">Tren Inferior</option>
                <option value="zona_media">Zona Media</option>
                <option value="tren_superior">Tren Superior</option>
              </select>
              <select style={s.filtroSelect} value={filtroKinesiologo} onChange={e => setFiltroKinesiologo(e.target.value)}>
                <option value="">Todos los kinesiólogos</option>
                {kinesiologos.map(k => <option key={k.id} value={k.id}>{k.nombre}</option>)}
              </select>
            </div>

            {clases.length === 0 && (
              <p style={s.estado}>No hay clases disponibles por el momento.</p>
            )}

            <div style={s.semanaWrap}>
              {clasesPorDia.map(grupo => (
                <section key={grupo.dia} style={s.diaSection}>
                  <div style={s.diaHeader}>
                    <h2 style={s.diaTitulo}>{grupo.nombre}</h2>
                    <span style={s.diaCantidad}>
                      {grupo.clases.length} clase{grupo.clases.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div style={s.diaCards}>
                    {grupo.clases.map(c => (
                      <div key={c.id} style={{ ...s.cardModerna, opacity: c.activa ? 1 : 0.5 }}>
                        <div style={s.cardTop}>
                          <span style={s.badgeTipo}>{TIPOS[c.tipo] ?? c.tipo}</span>
                          <span style={{ ...s.cupoTag, color: c.tiene_cupo ? '#2d6a2d' : '#c0392b' }}>
                            {c.tiene_cupo
                              ? `${c.cupos_disponibles} cupo${c.cupos_disponibles !== 1 ? 's' : ''}`
                              : 'Sin cupo'}
                          </span>
                        </div>
                        <p style={s.fechaClase}>
                          {DIAS[c.dia] ?? c.dia} {formatFechaCorta(c.fecha_clase)}
                        </p>
                        <div style={s.horaBloque}>
                          <span style={s.horaGrande}>{c.hora_inicio?.slice(0,5)}</span>
                          <span style={s.hsTexto}>hs</span>
                        </div>
                        <div style={s.metaGrid}>
                          {c.kinesiologo_nombre && (
                            <p style={s.metaItem}><IconUser /> {c.kinesiologo_nombre}</p>
                          )}
                          {c.sala && <p style={s.metaItem}>🚪 Sala {c.sala}</p>}
                        </div>
                        <div style={s.cardFooter}>
                          <span style={s.precioPill}>
                            ${parseFloat(c.precio).toLocaleString('es-AR')}
                          </span>
                          {c.activa && (
                            <button
                              style={{
                                ...s.btnReservarCompacto,
                                ...(c.tiene_cupo ? {} : s.btnEspera)
                              }}
                              onClick={() => c.tiene_cupo ? handleReservar(c) : setModalEspera(c)}
                            >
                              {c.tiene_cupo ? 'Reservar' : 'Lista de espera'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}

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
                    <button style={s.btnCancelarCard} onClick={() => setModalCancelar(r)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

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
      {confirmarLogout && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitulo}>¿Cerrar sesión?</h3>
            </div>
            <p style={{ fontSize: 14, color: '#555', margin: 0 }}>
              ¿Estás seguro que querés cerrar la sesión?
            </p>
            <div style={s.botonesRow}>
              <button style={s.btnGris} onClick={() => setConfirmarLogout(false)}>Cancelar</button>
              <button style={s.btnVerde} onClick={handleLogout}>Cerrar sesión</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

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
    textDecoration: 'none',
  },
  navActivo: { background: '#f0f7f0', color: '#2d6a2d', border: '1px solid #c3dfc3' },
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
  filtroSelect: {
    padding: '8px 12px', borderRadius: 8,
    border: '1px solid #ddd', fontSize: 14,
    background: '#fff', cursor: 'pointer',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 },
  card: { background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: 8 },
  cardTop:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  badgeTipo: { background: '#e8f5e9', color: '#2d6a2d', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 },
  cupoTag:   { fontSize: 12, fontWeight: 600 },
  cardMid:   { display: 'flex', gap: 10, alignItems: 'baseline' },
  diaTag:    { fontSize: 15, fontWeight: 600, color: '#333' },
  horaTag:   { fontSize: 20, fontWeight: 700, color: '#2d6a2d' },
  infoRow:   { display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#555', margin: 0 },
  precioTag: { fontSize: 14, fontWeight: 600, color: '#b8860b', margin: 0 },
  btnReservar: { marginTop: 4, padding: '9px', borderRadius: 8, border: 'none', background: '#2d6a2d', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnEspera: { background: '#fff', color: '#b8860b', border: '1px solid #f0d060' },
  listaReservas: { display: 'flex', flexDirection: 'column', gap: 12 },
  cardReserva: { background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '1rem 1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  reservaLeft:  { display: 'flex', alignItems: 'center', gap: 14 },
  reservaInfo:  { display: 'flex', gap: 14, flexWrap: 'wrap' },
  reservaDia:   { display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, color: '#333', fontWeight: 600 },
  reservaHora:  { display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, color: '#2d6a2d', fontWeight: 700 },
  reservaKine:  { display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#555' },
  reservaRight: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  estadoBadge:  { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#e8f5e9', color: '#2d6a2d' },
  btnCancelarCard: { padding: '7px 14px', borderRadius: 8, border: '1px solid #e74c3c', background: 'transparent', color: '#e74c3c', fontSize: 13, cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#fff', borderRadius: 14, padding: '2rem', width: '90%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 16 },
  modalHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitulo:  { fontSize: 17, fontWeight: 700, color: '#1a1a1a', margin: 0 },
  btnX:         { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#888' },
  modalClaseInfo: { background: '#f9f9f9', borderRadius: 8, padding: '12px 14px' },
  modalDia:     { fontSize: 15, fontWeight: 600, color: '#333', margin: '6px 0 0' },
  modalKine:    { fontSize: 13, color: '#555', margin: '4px 0 0' },
  seccion:      { display: 'flex', flexDirection: 'column', gap: 8 },
  seccionLabel: { fontSize: 13, fontWeight: 600, color: '#555', margin: 0 },
  opcionesRow:  { display: 'flex', gap: 8 },
  opcionBtn: { flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#333' },
  opcionActiva: { border: '1px solid #2d6a2d', background: '#e8f5e9', color: '#2d6a2d', fontWeight: 600 },
  totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fffbea', borderRadius: 8, padding: '10px 14px', border: '1px solid #f0d060' },
  totalLabel: { fontSize: 13, fontWeight: 600, color: '#555' },
  totalMonto: { fontSize: 18, fontWeight: 700, color: '#b8860b' },
  btnVerde: { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#2d6a2d', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  avisoAmarillo: { background: '#fffbea', border: '1px solid #f0d060', borderRadius: 8, padding: '12px 14px' },
  botonesRow:  { display: 'flex', gap: 10 },
  btnGris: { flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', fontSize: 14, cursor: 'pointer', color: '#555' },
  btnRojo: { flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#e74c3c', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  msgOk:    { color: '#2d6a2d', fontWeight: 600, fontSize: 14, margin: 0 },
  msgError: { color: '#c0392b', fontSize: 13, margin: 0 },
  semanaWrap: { display: 'flex', flexDirection: 'column', gap: 22 },
  diaSection: { background: '#fff', border: '1px solid #e6e8e6', borderRadius: 14, padding: '1rem' },
  diaHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #eef0ee', paddingBottom: 10 },
  diaTitulo: { margin: 0, fontSize: 16, fontWeight: 800, color: '#1f3d1f', letterSpacing: 0.5, textTransform: 'uppercase' },
  diaCantidad: { fontSize: 12, fontWeight: 600, color: '#6b7280', background: '#f3f4f6', padding: '4px 10px', borderRadius: 999 },
  diaCards: { display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6 },
  cardModerna: { background: '#fbfcfb', borderRadius: 12, border: '1px solid #e3e8e3', padding: '1rem', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 280, maxWidth: 280 },
  horaBloque: { display: 'flex', alignItems: 'baseline', gap: 6 },
  horaGrande: { fontSize: 28, fontWeight: 800, color: '#2d6a2d' },
  hsTexto: { fontSize: 13, fontWeight: 700, color: '#2d6a2d' },
  metaGrid: { display: 'flex', flexDirection: 'column', gap: 6 },
  metaItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#4b5563', margin: 0 },
  cardFooter: { marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  precioPill: { fontSize: 13, fontWeight: 800, color: '#9a6b00', background: '#fff7d6', border: '1px solid #f0d060', padding: '5px 9px', borderRadius: 999 },
  btnReservarCompacto: { padding: '8px 14px', borderRadius: 8, border: 'none', background: '#2d6a2d', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  fechaClase: { margin: 0, fontSize: 13, fontWeight: 800, color: '#1f3d1f' },
}
