import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Clases from '../components/Clases'
import Clientes from '../components/Clientes'
import Kinesiologos from '../components/Kinesiologos'
import { obtenerQuejas } from '../services/quejaService'
import ModalPagoEfectivo from '../components/PagoEfectivo'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

const iconProps = {
  width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
}

function IconWallet() {
  return (
    <svg {...iconProps}>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg {...iconProps}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconClipboard() {
  return (
    <svg {...iconProps}>
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <line x1="9" y1="10" x2="15" y2="10" />
      <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
  )
}

function IconUserPlus() {
  return (
    <svg {...iconProps}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  )
}

function IconUserX() {
  return (
    <svg {...iconProps}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="17" y1="8" x2="22" y2="13" />
      <line x1="22" y1="8" x2="17" y2="13" />
    </svg>
  )
}

function IconMessage() {
  return (
    <svg {...iconProps}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function IconChart() {
  return (
    <svg {...iconProps}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6"  y1="20" x2="6"  y2="14" />
    </svg>
  )
}

export default function AdminPage() {
  const { logout, access } = useAuth()
  const navigate          = useNavigate()
  const [modalEfectivo, setModalEfectivo] = useState(false)
  const [confirmarLogout, setConfirmarLogout] = useState(false)
  const [verClientes, setVerClientes]         = useState(false)
  const [verKinesiologos, setVerKinesiologos] = useState(false)
  const [precio, setPrecio]                   = useState(15000)
  const [inputPrecio, setInputPrecio]         = useState(15000)
  const [editandoPrecio, setEditandoPrecio]   = useState(false)
  const [quejas, setQuejas] = useState([])
  const [loadingQuejas, setLoadingQuejas] = useState(false)
  const [vista, setVista] = useState('principal')
  const [configCuota, setConfigCuota] = useState({ dia_inicio_pago: 1, dia_fin_pago: 18 })
  const [editandoCuota, setEditandoCuota] = useState(false)
  const [cuotaForm, setCuotaForm] = useState({ dia_inicio_pago: 1, dia_fin_pago: 18 })
  const [cuotaMsg, setCuotaMsg] = useState('')
  const [cuotaError, setCuotaError] = useState('')

  const [refreshKines, setRefreshKines] = useState(0)

  // Modal baja usuario
  const [modalBaja, setModalBaja]             = useState(false)
  const [bajaDni, setBajaDni]                 = useState('')
  const [bajaRol, setBajaRol]                 = useState('cliente')
  const [bajaError, setBajaError]             = useState('')
  const [bajaOk, setBajaOk]                   = useState('')
  const [bajaLoading, setBajaLoading]         = useState(false)
  // Reasignación de clases cuando se da de baja un kine
  const [clasesKine, setClasesKine]           = useState([])
  const [requiereReasignacion, setRequiereReasignacion] = useState(false)
  const [asignaciones, setAsignaciones]       = useState({})
  const [kinesiologos, setKinesiologos]       = useState([])

  // Modal registro kine
  const [modalKine, setModalKine] = useState(false)
  const [kineForm, setKineForm]   = useState({ nombre: '', apellido: '', dni: '', email: '' })
  const [kineError, setKineError] = useState('')
  const [kineOk, setKineOk]       = useState('')
  const [kineLoading, setKineLoading] = useState(false)
  const diasDelMesActual = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0
  ).getDate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  useEffect(() => {
    async function cargarConfiguracionCuota() {
      if (!access) return

      try {
        const res = await fetch(`${API}/pagos/cuota/configuracion/`, {
          headers: { 'Authorization': `Bearer ${access}` },
        })
        const data = await res.json()
        if (res.ok) {
          setConfigCuota(data)
          setCuotaForm(data)
        }
      } catch {
        setCuotaError('No se pudo cargar la configuracion de cuota.')
      }
    }

    cargarConfiguracionCuota()
  }, [access])

  const confirmarPrecio = () => {
    const nuevo = parseInt(inputPrecio)
    if (!isNaN(nuevo) && nuevo > 0) {
      setPrecio(nuevo)
      setEditandoPrecio(false)
    }
  }

  const confirmarConfiguracionCuota = async () => {
    setCuotaMsg('')
    setCuotaError('')

    try {
      const res = await fetch(`${API}/pagos/cuota/configuracion/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access}`,
        },
        body: JSON.stringify({
          dia_fin_pago: cuotaForm.dia_fin_pago,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setCuotaError(data.error ?? 'No se pudo actualizar la configuracion.')
        return
      }

      setConfigCuota({
        dia_inicio_pago: 1,
        dia_fin_pago: data.dia_fin_pago,
      })
      setCuotaForm({
        dia_inicio_pago: 1,
        dia_fin_pago: data.dia_fin_pago,
      })
      setEditandoCuota(false)
      setCuotaMsg(data.mensaje)
    } catch {
      setCuotaError('No se pudo conectar con el servidor.')
    }
  }

  const abrirModalBaja = () => {
    setBajaDni('')
    setBajaRol('cliente')
    setBajaError('')
    setBajaOk('')
    setClasesKine([])
    setRequiereReasignacion(false)
    setAsignaciones({})
    setModalBaja(true)
  }

  const handleBaja = async (asignacionesEnviar = null) => {
    setBajaError('')
    setBajaOk('')
    setBajaLoading(true)

    try {
      const body = { dni: bajaDni, rol: bajaRol }
      if (asignacionesEnviar) body.nuevo_kinesiologo_id = asignacionesEnviar

      const res = await fetch(`${API}/usuarios/baja-usuario/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access}`,
        },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (res.ok && data.requiere_reasignacion) {
        // El kine tiene clases — pedir reasignación
        setClasesKine(data.clases)
        setRequiereReasignacion(true)
      } else if (res.ok) {
        setBajaOk(data.mensaje)
        setBajaDni('')
        setRequiereReasignacion(false)
        setClasesKine([])
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
  
  const cargarQuejas = async () => {
    try {
      setLoadingQuejas(true)

      const res = await obtenerQuejas()

      if (res.data.mensaje === 'No hay quejas') {
        setQuejas([])
      } else {
        setQuejas(res.data)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingQuejas(false)
    }
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
        <div style={s.headerTopRow}>
          <div style={s.logoWrap}>
            <span style={s.logoK}>K</span>
            <span style={s.logoRest}>INESCIUS</span>
            <span style={s.badge}>Administrador</span>
          </div>

          <button style={s.btnLogout} onClick={() => setConfirmarLogout(true)}>
            Cerrar sesión
          </button>
        </div>

        <nav style={s.headerNav}>
          <button style={s.navLink} onClick={() => setModalEfectivo(true)}>
            <IconWallet /> Registrar pago en efectivo
          </button>

          <button
            style={{ ...s.navLink, ...(verClientes ? s.navLinkActive : {}) }}
            onClick={() => setVerClientes(v => !v)}
          >
            <IconUsers /> {verClientes ? 'Ocultar clientes' : 'Ver clientes registrados'}
          </button>

          <button
            style={{ ...s.navLink, ...(verKinesiologos ? s.navLinkActive : {}) }}
            onClick={() => setVerKinesiologos(v => !v)}
          >
            <IconClipboard /> {verKinesiologos ? 'Ocultar kinesiólogos' : 'Ver kinesiólogos registrados'}
          </button>

          <button style={s.navLink} onClick={abrirModalKine}>
            <IconUserPlus /> Registrar kinesiólogo
          </button>

          <button style={s.navLink} onClick={abrirModalBaja}>
            <IconUserX /> Dar de baja usuario
          </button>

          <button
            style={{ ...s.navLink, ...(vista === 'quejas' ? s.navLinkActive : {}) }}
            onClick={() => {
              setVista(v => (v === 'quejas' ? 'principal' : 'quejas'))
              cargarQuejas()
            }}
          >
            <IconMessage /> Ver listado de quejas
          </button>

          <button
            style={{ ...s.navLink, ...(vista === 'estadisticas' ? s.navLinkActive : {}) }}
            onClick={() => navigate('/estadisticas')}
          >
            <IconChart /> Estadísticas
          </button>
        </nav>
      </header>

      <main style={s.main}>
        {verClientes && <Clientes />}

        {/* ── Panel kinesiólogos ── */}
        {verKinesiologos && (
          <div style={s.panelBuscar}>
            <span style={s.panelPrecioLabel}>Kinesiólogos</span>
            <Kinesiologos />
          </div>
        )}

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

        <div style={s.panelPrecio}>
          <div style={s.panelPrecioLeft}>
            <span style={s.panelPrecioLabel}>Periodo de pago de cuota</span>
            {!editandoCuota ? (
              <span style={s.panelPrecioValor}>
                Dia 1 al {configCuota.dia_fin_pago}
              </span>
            ) : (
              <div style={s.cuotaInputs}>
                <span style={s.panelPrecioValor}>Dia 1 al</span>
                <input
                  style={s.panelPrecioInput}
                  type="number"
                  min={1}
                  max={diasDelMesActual}
                  value={cuotaForm.dia_fin_pago}
                  onChange={e => setCuotaForm(f => ({ ...f, dia_fin_pago: e.target.value }))}
                />
              </div>
            )}
            <span style={s.panelAyuda}>
              Los clientes pueden pagar la cuota mensual desde el dia 1 hasta el limite definido.
            </span>
            {cuotaMsg && <span style={s.msgInlineOk}>{cuotaMsg}</span>}
            {cuotaError && <span style={s.msgInlineError}>{cuotaError}</span>}
          </div>

          <div style={s.panelPrecioRight}>
            {!editandoCuota ? (
              <button
                style={s.btnModificar}
                onClick={() => {
                  setCuotaForm(configCuota)
                  setCuotaMsg('')
                  setCuotaError('')
                  setEditandoCuota(true)
                }}
              >
                Modificar fechas
              </button>
            ) : (
              <>
                <button style={s.btnCancelarPrecio} onClick={() => setEditandoCuota(false)}>
                  Cancelar
                </button>
                <button style={s.btnConfirmarVerde} onClick={confirmarConfiguracionCuota}>
                  Confirmar
                </button>
              </>
            )}
          </div>
        </div>

        {vista === 'quejas' && (
          <div style={{
            background: '#fff',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #ddd'
          }}>
            <h2>Listado de Quejas</h2>

            {loadingQuejas ? (
              <p>Cargando...</p>
            ) : quejas.length === 0 ? (
              <p>No hay quejas</p>
            ) : (
              quejas.map((queja) => (
                <div
                  key={queja.id}
                  style={{
                    borderBottom: '1px solid #eee',
                    padding: '12px 0'
                  }}
                >
                  <strong>{queja.cliente_nombre}</strong>

                  <p>{queja.descripcion}</p>

                  <small>
                    {new Date(queja.fecha_creacion).toLocaleString()}
                  </small>
                </div>
              ))
            )}
          </div>
        )}

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

            {!requiereReasignacion ? (
              <>
                <p style={s.modalTexto}>Ingresá el DNI y el rol del usuario que querés dar de baja.</p>

                <div style={s.formGroup}>
                  <label style={s.label}>Rol</label>
                  <select
                    style={s.input}
                    value={bajaRol}
                    onChange={e => setBajaRol(e.target.value)}
                  >
                    <option value="cliente">Cliente</option>
                    <option value="kinesiologo">Kinesiólogo</option>
                  </select>
                </div>

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
                  <button style={s.btnCancelar} onClick={() => setModalBaja(false)} disabled={bajaLoading}>
                    Cancelar
                  </button>
                  <button
                    style={{ ...s.btnBajaConfirmar, opacity: bajaLoading ? 0.7 : 1 }}
                    onClick={() => handleBaja()}
                    disabled={bajaLoading}
                  >
                    {bajaLoading ? 'Procesando...' : 'Dar de baja'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={s.modalTexto}>
                  Este kinesiólogo tiene <strong>{clasesKine.length}</strong> clase(s) activa(s). 
                  Seleccioná un kinesiólogo disponible para cada una.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 320, overflowY: 'auto' }}>
                  {clasesKine.map(c => (
                    <div key={c.id} style={s.formGroup}>
                      <label style={s.label}>
                        {c.tipo} — {c.dia} {c.hora_inicio}
                      </label>
                      <select
                        style={s.input}
                        value={asignaciones[c.id] ?? ''}
                        onChange={e =>
                          setAsignaciones(a => ({ ...a, [c.id]: e.target.value }))
                        }
                      >
                        <option value="">Seleccioná un kinesiólogo...</option>
                        {c.kinesiologos_disponibles.length === 0 && (
                          <option value="" disabled>No hay kinesiólogos disponibles para este horario</option>
                        )}
                        {c.kinesiologos_disponibles.map(k => (
                          <option key={k.id} value={k.id}>{k.nombre}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {bajaError && <p style={s.error}>{bajaError}</p>}

                <div style={s.botonesRow}>
                  <button style={s.btnCancelar} onClick={() => { setRequiereReasignacion(false); setClasesKine([]) }}>
                    Atrás
                  </button>
                  <button
                    style={{
                      ...s.btnBajaConfirmar,
                      opacity: (clasesKine.some(c => !asignaciones[c.id]) || bajaLoading) ? 0.5 : 1,
                    }}
                    onClick={() => handleBaja(JSON.stringify(asignaciones))}
                    disabled={clasesKine.some(c => !asignaciones[c.id]) || bajaLoading}
                  >
                    {bajaLoading ? 'Procesando...' : 'Confirmar baja'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Modal pago en efectivo ── */}
      {modalEfectivo && (
        <ModalPagoEfectivo access={access} onCerrar={() => setModalEfectivo(false)} />
      )}

    </div>
  )
}

const s = {
  page:     { minHeight: '100vh', background: '#f5f6f7' },
  header:   { background: '#fff', borderBottom: '1px solid #e5e5e5', padding: '12px 2rem', display: 'flex', flexDirection: 'column', gap: 10 },
  headerTopRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 4 },
  logoK:    { fontSize: 22, fontWeight: 700, color: '#2d6a2d' },
  logoRest: { fontSize: 22, fontWeight: 700, color: '#1a1a1a', letterSpacing: 1 },
  badge:    { marginLeft: 12, fontSize: 11, fontWeight: 600, background: '#e8f5e9', color: '#2d6a2d', padding: '3px 10px', borderRadius: 20 },
  btnLogout:{ padding: '7px 16px', borderRadius: 8, border: '1px solid #ddd', background: 'transparent', fontSize: 13, cursor: 'pointer', color: '#555' },

  main:     { padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' },

  // ── Nav del header (acciones de administrador) ──
  headerNav: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
    paddingTop: 10,
    borderTop: '1px solid #eee',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid transparent',
    background: 'transparent',
    color: '#444',
    fontSize: 13.5,
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  navLinkActive: {
    background: '#eef7ee',
    border: '1px solid #cfe8cf',
    color: '#2d6a2d',
    fontWeight: 600,
  },

  btnBajaConfirmar: {
    flex: 1, padding: '10px', borderRadius: 8, border: 'none',
    background: '#c0392b', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },

  panelPrecio: { background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: '1rem 1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  panelBuscar: { background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: '1rem 1.4rem', display: 'flex', flexDirection: 'column', gap: 10 },
  panelPrecioLeft:  { display: 'flex', flexDirection: 'column', gap: 4 },
  panelPrecioLabel: { fontSize: 12, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  panelPrecioValor: { fontSize: 22, fontWeight: 700, color: '#c8a000' },
  panelPrecioInput: { fontSize: 20, fontWeight: 700, color: '#c8a000', border: '1px solid #ddd', borderRadius: 8, padding: '4px 10px', width: 140, outline: 'none' },
  panelPrecioRight: { display: 'flex', gap: 8 },
  panelAyuda: { fontSize: 12, color: '#777' },
  cuotaInputs: { display: 'flex', gap: 8 },
  msgInlineOk: { fontSize: 12, color: '#2d6a2d', fontWeight: 600 },
  msgInlineError: { fontSize: 12, color: '#c0392b', fontWeight: 600 },
  btnModificar:     { padding: '8px 16px', borderRadius: 8, border: '1px solid #c8a000', background: 'transparent', color: '#c8a000', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnCancelarPrecio:{ padding: '8px 14px', borderRadius: 8, border: '1px solid #ddd', background: 'transparent', fontSize: 13, cursor: 'pointer', color: '#555' },

  overlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal:    { background: '#fff', borderRadius: 14, padding: '2rem', width: '90%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 14 },
  modalTitulo: { fontSize: 17, fontWeight: 700, color: '#1a1a1a', margin: 0 },
  modalTexto:  { fontSize: 14, color: '#555', margin: 0 },
  botonesRow:  { display: 'flex', gap: 10, marginTop: 4 },
  btnCancelar: { flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', fontSize: 14, cursor: 'pointer', color: '#555' },
  btnConfirmarVerde: { flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#2d6a2d', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },

  clasesList: { display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 120, overflowY: 'auto' },
  claseItem:  { fontSize: 13, color: '#555', background: '#f5f6f7', padding: '6px 10px', borderRadius: 6 },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 6, width: '100%' },
  label:     { fontSize: 12, fontWeight: 600, color: '#555' },
  input:     { padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' },
  error:     { fontSize: 13, color: '#c0392b', margin: 0, background: '#fdf0f0', padding: '8px 12px', borderRadius: 8 },
  ok:        { fontSize: 13, color: '#2d6a2d', margin: 0, background: '#e8f5e9', padding: '8px 12px', borderRadius: 8 },
}