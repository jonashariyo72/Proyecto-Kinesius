import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Clases from '../components/Clases'
import api from '../services/clasesService'
import FichaEvolucion from "../components/FichaEvolucion"

export default function KinesiologoPage() {
  const { logout, access } = useAuth()
  const navigate           = useNavigate()

  const [confirmarLogout, setConfirmarLogout] = useState(false)
  const [perfil, setPerfil]                   = useState(null)
  const [vista, setVista] = useState("clases")

  useEffect(() => {
    api.get('/usuarios/perfil-kinesiologo/')
      .then(res => setPerfil(res.data))
      .catch(() => console.error('No se pudo cargar el perfil'))
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.logoWrap}>
          <span style={s.logoK}>K</span>
          <span style={s.logoRest}>INESCIUS</span>
          <span style={s.badge}>Kinesiólogo</span>
        </div>
        {perfil && (
          <span style={s.nombre}>
            {perfil.nombre} {perfil.apellido}
          </span>
        )}
        <button style={s.btnLogout} onClick={() => setConfirmarLogout(true)}>
          Cerrar sesión
        </button>
      </header>

      <div style={s.menu}>
        <button
          style={{
            ...s.btnMenu,
            ...(vista === "clases" ? s.btnMenuActivo : {})
          }}
          onClick={() => setVista("clases")}
        >
          Mis clases
        </button>

        <button
          style={{
            ...s.btnMenu,
            ...(vista === "evolucion" ? s.btnMenuActivo : {})
          }}
          onClick={() => setVista("evolucion")}
        >
          Registrar evolución
        </button>
      </div>

      <main style={s.main}>
        {perfil && vista === "clases" && (
          <Clases
            modoKinesiologo={true}
            kineId={perfil.id}
          />
        )}

        {perfil && vista === "evolucion" && (
          <FichaEvolucion />
        )}
      </main>

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
  header:   { background: '#fff', borderBottom: '1px solid #e5e5e5', padding: '0 2rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 4 },
  logoK:    { fontSize: 22, fontWeight: 700, color: '#2d6a2d' },
  logoRest: { fontSize: 22, fontWeight: 700, color: '#1a1a1a', letterSpacing: 1 },
  badge:    { marginLeft: 12, fontSize: 11, fontWeight: 600, background: '#e8f5e9', color: '#2d6a2d', padding: '3px 10px', borderRadius: 20 },
  nombre:   { fontSize: 14, color: '#555', fontWeight: 500, flex: 1 },
  btnLogout:{ padding: '7px 16px', borderRadius: 8, border: '1px solid #ddd', background: 'transparent', fontSize: 13, cursor: 'pointer', color: '#555' },
  main:     { padding: '1.5rem' },
  overlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal:    { background: '#fff', borderRadius: 14, padding: '2rem', width: '90%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 16 },
  modalTitulo: { fontSize: 17, fontWeight: 700, color: '#1a1a1a', margin: 0 },
  modalTexto:  { fontSize: 14, color: '#555', margin: 0 },
  botonesRow:  { display: 'flex', gap: 10 },
  btnCancelar: { flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', fontSize: 14, cursor: 'pointer', color: '#555' },
  btnConfirmar:{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#2d6a2d', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  menu: {
    display: "flex",
    gap: 12,
    padding: "20px 24px 0",
  },

  btnMenu: {
    padding: "10px 18px",
    borderRadius: 8,
    border: "1px solid #ddd",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  },

  btnMenuActivo: {
    background: "#2d6a2d",
    color: "#fff",
    border: "1px solid #2d6a2d",
  },
}