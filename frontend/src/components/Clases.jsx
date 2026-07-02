import { useEffect, useState } from 'react'
import api from '../services/clasesService'
import ListaEspera from './ListaEspera'
import InscriptosList from './InscriptosList'
import DatePicker, { registerLocale } from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

import { addMonths, isWeekend } from 'date-fns'
import { es } from 'date-fns/locale'

registerLocale('es', es)

const TIPOS = [
  { value: 'tren_inferior', label: 'Tren Inferior' },
  { value: 'zona_media',    label: 'Zona Media' },
  { value: 'tren_superior', label: 'Tren Superior' },
]

const SALAS = [
  { id: 1,  capacidad: 12 },
  { id: 2,  capacidad: 15 },
  { id: 3,  capacidad: 10 },
  { id: 4,  capacidad: 18 },
  { id: 5,  capacidad: 14 },
  { id: 6,  capacidad: 20 },
  { id: 7,  capacidad: 11 },
  { id: 8,  capacidad: 16 },
  { id: 9,  capacidad: 13 },
  { id: 10, capacidad: 19 },
]

const FORM_VACIO = {
  tipo: '',
  fecha: null,
  hora_inicio: '',
  sala: '',
  capacidad_maxima: '',
  kinesiologo: '',
  precio: 15000,
  descripcion: '',
}

export default function Clases({ precioPorDefecto = 15000, refreshKines = 0, modoKinesiologo = false, kineId = null }) {
  const [modalListaEspera, setModalListaEspera]   = useState(null)
  const [modalInscriptos, setModalInscriptos]     = useState(null)
  const [clases, setClases]                       = useState([])
  const [loading, setLoading]                     = useState(true)
  const [error, setError]                         = useState('')
  const [filtroDia, setFiltroDia]                 = useState('')
  const [filtroTipo, setFiltroTipo]               = useState('')
  const [filtroKinesiologo, setFiltroKinesiologo] = useState('')
  const [modal, setModal]                         = useState(false)
  const [form, setForm]                           = useState({ ...FORM_VACIO, precio: precioPorDefecto })
  const [editando, setEditando]                   = useState(null)
  const [guardando, setGuardando]                 = useState(false)
  const [kinesiologos, setKinesiologos]           = useState([])
  const [formError, setFormError]                 = useState('')
  const [minCapacidad, setMinCapacidad]           = useState(1)
  const [modalEliminar, setModalEliminar]         = useState(null)
  const [toast, setToast]                         = useState('')
  const [modalQR, setModalQR] = useState(null)
  const [cargandoQR, setCargandoQR] = useState(false)
  const [errorQR, setErrorQR] = useState('')

  const [modalBuscarClase, setModalBuscarClase] = useState(null) // clase seleccionada
  const [buscarQuery, setBuscarQuery]           = useState('')
  const [buscarResultados, setBuscarResultados] = useState(null)
  const [buscarError, setBuscarError]           = useState('')
  const [buscarLoading, setBuscarLoading]       = useState(false)
    form.tipo && form.fecha && form.hora_inicio && form.sala && form.kinesiologo


  const formularioCompleto =
  form.tipo &&
  form.fecha &&
  form.hora_inicio &&
  form.sala &&
  form.kinesiologo
    
  const cargar = async () => {
    setLoading(true)
    setError('')
    try {
    const params = new URLSearchParams()
    if (filtroDia)  params.append('dia', filtroDia)
    if (filtroTipo) params.append('tipo', filtroTipo)

    let res

    if (modoKinesiologo) {
      res = await api.get('/clases/mis-clases/')
    } else {
      if (filtroKinesiologo) params.append('kinesiologo', filtroKinesiologo)
      res = await api.get(`/clases/?${params.toString()}`)
    }

    let data = Array.isArray(res.data) ? res.data : res.data.results ?? []

    if (modoKinesiologo) {
      if (filtroDia) data = data.filter(c => c.dia === filtroDia)
      if (filtroTipo) data = data.filter(c => c.tipo === filtroTipo)
    }

    setClases(data)
    } catch {
      setError('No se pudieron cargar las clases.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [filtroDia, filtroTipo, filtroKinesiologo])

  useEffect(() => {
    api.get('/usuarios/kinesiologos/')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : res.data.results ?? []
        setKinesiologos(data)
      })
      .catch(() => console.error('No se pudieron cargar los kinesiólogos'))
  }, [refreshKines])

  const abrirCrear = () => {
    setEditando(null)
    setMinCapacidad(1)
    setForm({ ...FORM_VACIO, precio: precioPorDefecto })
    setFormError('')
    setModal(true)
  }

  const abrirEditar = c => {
    setEditando(c.id)
    setFormError('')
    setMinCapacidad(c.capacidad_maxima - c.cupos_disponibles)
    setForm({
      tipo:             c.tipo,
      fecha:            c.fecha_clase ? new Date(c.fecha_clase + 'T00:00:00') : null,
      hora_inicio:      c.hora_inicio?.slice(0, 5),
      sala:             c.sala ? String(c.sala) : '',
      capacidad_maxima: c.capacidad_maxima,
      kinesiologo:      c.kinesiologo || '',
      precio:           c.precio || precioPorDefecto,
      descripcion:      c.descripcion || '',
    })
    setModal(true)
  }

  const guardar = async e => {
    e.preventDefault()
    if (!form.tipo || !form.fecha || !form.hora_inicio || !form.sala || !form.kinesiologo) {
      alert('Por favor completá todos los campos antes de crear la clase.')
      return
    }
    setGuardando(true)
    try {
      const payload = {
        tipo: form.tipo,
        dia: form.fecha
          ? ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'][form.fecha.getDay()]
          : '',
        fecha_clase: form.fecha
          ? `${form.fecha.getFullYear()}-${String(form.fecha.getMonth()+1).padStart(2,'0')}-${String(form.fecha.getDate()).padStart(2,'0')}`
          : null,
        hora_inicio:      form.hora_inicio,
        capacidad_maxima: form.capacidad_maxima,
        precio:           form.precio,
        kinesiologo:      form.kinesiologo,
        descripcion:      form.descripcion,
        sala:             parseInt(form.sala),
      }
      editando
        ? await api.patch(`/clases/${editando}/`, payload)
        : await api.post('/clases/', payload)
      setModal(false)
      cargar()
    } catch (err) {
      const data = err.response?.data
      if (data?.sala?.length)              setFormError(data.sala[0])
      else if (data?.kinesiologo?.length)  setFormError(data.kinesiologo[0])
      else if (data?.__all__?.length)      setFormError(data.__all__[0])
      else if (data?.non_field_errors?.length) setFormError(data.non_field_errors[0])
      else setFormError('No se pudo guardar la clase.')
    } finally {
      setGuardando(false)
    }
  }

  const abrirBuscarClase = (clase) => {
    setModalBuscarClase(clase)
    setBuscarQuery('')
    setBuscarResultados(null)
    setBuscarError('')
  }

  const buscarEnClase = async () => {
    if (!buscarQuery.trim()) {
      setBuscarError('Ingresá un nombre o DNI.')
      return
    }
    setBuscarError('')
    setBuscarResultados(null)
    setBuscarLoading(true)
    try {
      const res = await api.get(
        `/usuarios/buscar-cliente-kinesiologo/?q=${encodeURIComponent(buscarQuery)}&clase_id=${modalBuscarClase.id}`
      )
      setBuscarResultados(res.data)
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Error al buscar.'
      setBuscarError(msg)
    } finally {
      setBuscarLoading(false)
    }
  }

  const desactivar = async () => {
    if (!modalEliminar) return
    try {
      await api.delete(`/clases/${modalEliminar.id}/`)
      setModalEliminar(null)
      cargar()
      setToast('✅ La clase ha sido eliminada correctamente.')
      setTimeout(() => setToast(''), 3500)
    } catch {
      alert('No se pudo eliminar.')
    }
  }

  const generarQR = async clase => {
  setCargandoQR(true)
  setErrorQR('')
  setModalQR({ clase, data: null })

  try {
    const res = await api.get(`/clases/generar-qr/${clase.id}/`)
    setModalQR({ clase, data: res.data })
  } catch (err) {
    setErrorQR(err.response?.data?.error || 'No se pudo generar el QR.')
  } finally {
    setCargandoQR(false)
  }
}

  return (
    <div>
      {toast && <div style={s.toast}>{toast}</div>}

      <div style={s.topBar}>
        <div>
          <h1 style={s.titulo}>Clases</h1>
          <p style={s.sub}>{clases.length} clase{clases.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={s.topRight}>
          <select style={s.select} value={filtroDia} onChange={e => setFiltroDia(e.target.value)}>
            <option value="">Todos los días</option>
            <option value="lunes">Lunes</option>
            <option value="martes">Martes</option>
            <option value="miercoles">Miércoles</option>
            <option value="jueves">Jueves</option>
            <option value="viernes">Viernes</option>
          </select>
          <select style={s.select} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {!modoKinesiologo && (
            <select style={s.select} value={filtroKinesiologo} onChange={e => setFiltroKinesiologo(e.target.value)}>
              <option value="">Todos los kinesiólogos</option>
              {kinesiologos.map(k => <option key={k.id} value={k.id}>{k.nombre}</option>)}
            </select>
          )}
          {!modoKinesiologo && (
            <button style={{ ...s.btnVerde, cursor: 'pointer' }} onClick={abrirCrear}>
              + Nueva clase
            </button>
          )}
        </div>
      </div>

      {loading && <p style={s.estado}>Cargando...</p>}
      {error   && <p style={s.errorTxt}>{error}</p>}
      {!loading && !error && clases.length === 0 && <p style={s.estado}>No hay clases registradas.</p>}

      <div style={s.grid}>
        {clases.map(c => (
          <div key={c.id} style={{ ...s.card, opacity: c.activa ? 1 : 0.5 }}>
            <div style={s.cardTop}>
              <span style={s.badge}>{TIPOS.find(t => t.value === c.tipo)?.label}</span>
              <span style={{ ...s.cupo, color: c.tiene_cupo ? '#2d6a2d' : '#c0392b' }}>
                {c.capacidad_maxima - c.cupos_disponibles}/{c.capacidad_maxima} inscriptos
              </span>
            </div>

            <div style={s.cardMid}>
              <span style={s.dia}>
                {c.fecha_clase
                  ? (() => {
                      const fecha = new Date(c.fecha_clase + 'T00:00:00')
                      const texto = fecha.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
                      return texto.charAt(0).toUpperCase() + texto.slice(1)
                    })()
                  : c.dia.charAt(0).toUpperCase() + c.dia.slice(1)}
              </span>
              <span style={s.hora}>{c.hora_inicio?.slice(0, 5)} hs</span>
            </div>

            {c.kinesiologo_nombre && (
              <div>
                <p style={s.kine}>👤 {c.kinesiologo_nombre}</p>
                <p style={{ ...s.kine, color: '#888', fontSize: 11 }}>{c.kinesiologo_email}</p>
              </div>
            )}
            {c.sala && <p style={s.kine}>🚪 Sala {c.sala}</p>}
            <p style={s.precio}>$ {parseFloat(c.precio).toLocaleString('es-AR')}</p>
            {!c.tiene_cupo && <span style={s.llena}>SIN CUPO</span>}
            {!c.activa    && <span style={s.inactiva}>INACTIVA</span>}

            {/* Botones para Admin */}
            {c.activa && !modoKinesiologo && (
              <div style={s.accionesAdmin}>
                <div style={s.acciones}>
                  <button style={s.btnEditar}  onClick={() => abrirEditar(c)}>Editar</button>
                  <button style={s.btnEliminar} onClick={() => setModalEliminar(c)}>Eliminar</button>
                </div>
                <div style={s.acciones}>
                  <button style={s.btnLista}         onClick={() => setModalListaEspera(c)}>Lista de espera</button>
                  <button style={s.btnVerInscriptos} onClick={() => setModalInscriptos(c)}>Ver inscriptos</button>
                </div>
              </div>
            )}

          {/* Botones para Kinesiólogo */}
          {c.activa && modoKinesiologo && (
            <div style={s.acciones}>
              <button style={s.btnVerInscriptos} onClick={() => setModalInscriptos(c)}>
                Ver inscriptos
              </button>
              <button style={s.btnBuscarCliente} onClick={() => abrirBuscarClase(c)}>
                Buscar cliente
              </button>
              <button
                style={s.btnLista}
                onClick={() => {
                  console.log('Click Generar QR', c)
                  generarQR(c)
                }}
              >
                Generar QR
              </button>
            </div>
          )}
          </div>
        ))}
      </div>

      {/* Modal crear / editar */}
      {modal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h2 style={s.modalTitulo}>{editando ? 'Editar clase' : 'Nueva clase'}</h2>
            {formError && <p style={s.errorTxt}>{formError}</p>}
            <form onSubmit={guardar} style={s.formGrid}>
              <div style={s.campo}>
                <label style={s.label}>Tipo</label>
                <select style={s.input} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                  <option value="">Sin asignar</option>
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div style={s.campo}>
                <label style={s.label}>Fecha</label>
                <DatePicker
                  selected={form.fecha}
                  onChange={date => setForm({ ...form, fecha: date })}
                  minDate={new Date()}
                  maxDate={addMonths(new Date(), 1)}
                  filterDate={date => !isWeekend(date)}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Seleccioná una fecha"
                  locale="es"
                  customInput={<input style={{ ...s.input, width: '100%', cursor: 'pointer' }} readOnly />}
                />
              </div>
              <div style={s.campo}>
                <label style={s.label}>Sala</label>
                <select style={s.input} value={form.sala} onChange={e => setForm({ ...form, sala: e.target.value })}>
                  <option value="">Sin asignar</option>
                  {SALAS.map(sa => <option key={sa.id} value={String(sa.id)}>Sala {sa.id}</option>)}
                </select>
              </div>
              <div style={s.campo}>
                <label style={s.label}>Hora de inicio</label>
                <input
                  style={s.input}
                  type="time"
                  value={form.hora_inicio}
                  onChange={e => setForm({ ...form, hora_inicio: e.target.value })}
                />
              </div>
              <div style={s.campo}>
                <label style={s.label}>Capacidad máxima</label>
                <input
                  style={s.input}
                  type="number"
                  min={editando ? minCapacidad : 1}
                  value={form.capacidad_maxima}
                  onChange={e => { e.target.setCustomValidity(''); setForm({ ...form, capacidad_maxima: e.target.value }) }}
                  onInvalid={e => e.target.setCustomValidity(`La capacidad debe ser mayor o igual a ${minCapacidad}`)}
                  required
                />
              </div>
              <div style={s.campo}>
                <label style={s.label}>Kinesiólogo</label>
                <select style={s.input} value={form.kinesiologo} onChange={e => setForm({ ...form, kinesiologo: e.target.value })}>
                  <option value="">Sin asignar</option>
                  {kinesiologos.map(k => <option key={k.id} value={k.id}>{k.nombre}</option>)}
                </select>
              </div>
              <div style={s.campo}>
                <label style={s.label}>Precio ($)</label>
                <input style={{ ...s.input, background: '#f5f5f5', color: '#888' }} type="number" value={form.precio} readOnly />
              </div>
              <div style={{ ...s.campo, gridColumn: '1 / -1' }}>
                <label style={s.label}>Descripción (opcional)</label>
                <textarea
                  style={{ ...s.input, height: 70, resize: 'vertical' }}
                  value={form.descripcion}
                  onChange={e => setForm({ ...form, descripcion: e.target.value })}
                />
              </div>
              <div style={{ ...s.acciones, gridColumn: '1 / -1', marginTop: 4 }}>
                <button type="button" style={s.btnCancelar} onClick={() => setModal(false)}>Cancelar</button>
                <button
                  type="submit"
                  style={{ ...s.btnVerde, opacity: formularioCompleto ? 1 : 0.5, cursor: formularioCompleto ? 'pointer' : 'not-allowed', userSelect: 'none' }}
                  disabled={!formularioCompleto || guardando}
                >
                  {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear clase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal eliminar */}
      {modalEliminar && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h2 style={s.modalTitulo}>Eliminar clase</h2>
            <p style={{ fontSize: 14, color: '#555', margin: '0 0 12px' }}>
              ¿Estás seguro que querés eliminar esta clase?
            </p>
            {modalEliminar.capacidad_maxima - modalEliminar.cupos_disponibles > 0 && (
              <div style={s.avisoRojo}>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
                  ⚠️ Se cancelarán todas las reservas activas y se procesarán las devoluciones automáticamente.
                </p>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button style={s.btnCancelar} onClick={() => setModalEliminar(null)}>Cancelar</button>
              <button style={s.btnEliminarConfirm} onClick={desactivar}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      {modalQR && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h2 style={s.modalTitulo}>QR de asistencia</h2>

            <p style={{ fontSize: 14, color: '#555', marginTop: 0 }}>
              {modalQR.clase.fecha_clase} - {modalQR.clase.hora_inicio?.slice(0, 5)} hs
            </p>

            {cargandoQR && <p style={s.estado}>Generando QR...</p>}
            {errorQR && <p style={s.errorTxt}>{errorQR}</p>}

            {modalQR.data?.qr_image && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <img
                  src={modalQR.data.qr_image}
                  alt="QR de asistencia"
                  style={{ width: 260, height: 260 }}
                />

                <p style={{ fontSize: 12, color: '#777', textAlign: 'center', wordBreak: 'break-all' }}>
                  {modalQR.data.url_asistencia}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button style={s.btnCancelar} onClick={() => setModalQR(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalListaEspera && (
        <ListaEspera
          claseId={modalListaEspera.id}
          onCerrar={() => setModalListaEspera(null)}
          modoAdmin={true}
        />
      )}

      {modalInscriptos && (
        <InscriptosList
          clase={modalInscriptos}
          onCerrar={() => setModalInscriptos(null)}
        />
      )}
      {modalBuscarClase && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h2 style={s.modalTitulo}>
              Buscar cliente en {modalBuscarClase.hora_inicio?.slice(0,5)} hs — {modalBuscarClase.dia}
            </h2>

            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                style={{ ...s.input, flex: 1 }}
                placeholder="Nombre o DNI..."
                value={buscarQuery}
                onChange={e => setBuscarQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && buscarEnClase()}
                autoFocus
              />
              <button
                style={{ ...s.btnVerde, padding: '0 16px', opacity: buscarLoading ? 0.7 : 1 }}
                onClick={buscarEnClase}
                disabled={buscarLoading}
              >
                {buscarLoading ? '...' : 'Buscar'}
              </button>
            </div>

            {buscarError && (
              <p style={{ fontSize: 13, color: '#c0392b', background: '#fdf0f0', padding: '8px 12px', borderRadius: 8, margin: '0 0 8px' }}>
                {buscarError}
              </p>
            )}

            {buscarResultados && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                {buscarResultados.map(c => (
                  <div key={c.id} style={{ background: '#f5f6f7', borderRadius: 8, padding: '10px 14px' }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{c.nombre} {c.apellido}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: '#555' }}>DNI: {c.dni}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: '#555' }}>{c.email}</p>
                    {c.suspendido && <span style={{ fontSize: 11, fontWeight: 600, background: '#fdf0f0', color: '#c0392b', padding: '2px 8px', borderRadius: 20 }}>Suspendido</span>}
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <button
                style={s.btnCancelar}
                onClick={() => { setModalBuscarClase(null); setBuscarResultados(null) }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  btnLista: { flex: 1, padding: '7px', borderRadius: 7, border: '1px solid #c8a000', background: 'transparent', color: '#c8a000', fontSize: 13, cursor: 'pointer' },
  toast: { position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1a1a1a', color: '#fff', padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 500, zIndex: 999, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 },
  topRight: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  titulo: { fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: 0 },
  sub: { fontSize: 13, color: '#888', margin: '4px 0 0' },
  select: { padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 },
  btnVerde: { padding: '9px 18px', borderRadius: 8, border: 'none', background: '#2d6a2d', color: '#fff', fontSize: 14, fontWeight: 600, transition: '0.2s', cursor: 'pointer', userSelect: 'none' },
  estado: { textAlign: 'center', color: '#aaa', padding: '3rem' },
  errorTxt: { color: '#c0392b', fontSize: 13, margin: '0 0 12px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 },
  card: { background: '#fff', borderRadius: 12, border: '1px solid #e5e5e5', padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: 8 },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  badge: { background: '#e8f5e9', color: '#2d6a2d', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 },
  cupo: { fontSize: 12, fontWeight: 600 },
  cardMid: { display: 'flex', gap: 12, alignItems: 'baseline' },
  dia: { fontSize: 13, fontWeight: 600, color: '#333' },
  hora: { fontSize: 20, fontWeight: 700, color: '#2d6a2d' },
  kine: { fontSize: 13, color: '#555', margin: 0, wordBreak: 'break-all' },
  precio: { fontSize: 14, fontWeight: 600, color: '#c8a000', margin: 0 },
  llena: { fontSize: 11, fontWeight: 700, color: '#c0392b', background: '#fdecea', padding: '2px 8px', borderRadius: 4, alignSelf: 'flex-start' },
  inactiva: { fontSize: 11, fontWeight: 700, color: '#888', background: '#f0f0f0', padding: '2px 8px', borderRadius: 4, alignSelf: 'flex-start' },
  accionesAdmin: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 },
  acciones: { display: 'flex', gap: 8 },
  btnVerInscriptos: { flex: 1, padding: '7px', borderRadius: 7, border: '1px solid #2d6a2d', background: 'transparent', color: '#2d6a2d', fontSize: 13, cursor: 'pointer', fontWeight: 600 },
  btnBuscarCliente: { flex: 1, padding: '7px', borderRadius: 7, border: 'none', background: '#2d6a2d', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 },
  btnEliminar: { flex: 1, padding: '7px', borderRadius: 7, border: '1px solid #e74c3c', background: 'transparent', color: '#e74c3c', fontSize: 13, cursor: 'pointer' },
  btnEditar: { flex: 1, padding: '7px', borderRadius: 7, border: '0.5px solid #3c56e7', background: 'transparent', color: '#3c56e7', fontSize: 13, cursor: 'pointer' },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#fff', borderRadius: 14, padding: '2rem', width: '90%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' },
  modalTitulo: { fontSize: 18, fontWeight: 700, margin: '0 0 1.2rem', color: '#1a1a1a' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  campo: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 13, fontWeight: 500, color: '#555' },
  input: { height: 40, padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  btnCancelar: { flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #ddd', background: 'transparent', fontSize: 14, cursor: 'pointer' },
  avisoRojo: { background: '#fdecea', border: '1px solid #f5c6cb', borderRadius: 8, padding: '10px 14px' },
  btnEliminarConfirm: { flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: '#e74c3c', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
}