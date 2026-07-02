import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import EstadisticasMeses from '../components/EstadisticasMeses'

function IconChart() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6"  y1="20" x2="6"  y2="14" />
    </svg>
  )
}

function IconArrow() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

export default function EstadisticasPage() {
  const navigate      = useNavigate()
  const { logout }    = useAuth()
  const [confirmarLogout, setConfirmarLogout] = [false, () => {}]

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.headerTopRow}>
          <div style={s.logoWrap}>
            <span style={s.logoK}>K</span>
            <span style={s.logoRest}>INESCIUS</span>
            <span style={s.badge}>Administrador</span>
          </div>
          <button style={s.btnLogout} onClick={() => { logout(); navigate('/login') }}>
            Cerrar sesión
          </button>
        </div>

        <nav style={s.headerNav}>
          <button style={s.navLink} onClick={() => navigate('/admin')}>
            <IconArrow /> Volver al panel
          </button>
        </nav>
      </header>

      <main style={s.main}>
        <div style={s.titleRow}>
          <IconChart />
          <h1 style={s.title}>Estadísticas</h1>
        </div>
        <EstadisticasMeses />
      </main>
    </div>
  )
}

const s = {
  page:         { minHeight: '100vh', background: '#f5f6f7' },
  header:       { background: '#fff', borderBottom: '1px solid #e5e5e5', padding: '12px 2rem', display: 'flex', flexDirection: 'column', gap: 10 },
  headerTopRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  logoWrap:     { display: 'flex', alignItems: 'center', gap: 4 },
  logoK:        { fontSize: 22, fontWeight: 700, color: '#2d6a2d' },
  logoRest:     { fontSize: 22, fontWeight: 700, color: '#1a1a1a', letterSpacing: 1 },
  badge:        { marginLeft: 12, fontSize: 11, fontWeight: 600, background: '#e8f5e9', color: '#2d6a2d', padding: '3px 10px', borderRadius: 20 },
  btnLogout:    { padding: '7px 16px', borderRadius: 8, border: '1px solid #ddd', background: 'transparent', fontSize: 13, cursor: 'pointer', color: '#555' },
  headerNav:    { display: 'flex', gap: 6, flexWrap: 'wrap' },
  navLink:      { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: '1px solid #e5e5e5', background: 'transparent', fontSize: 13, fontWeight: 500, color: '#444', cursor: 'pointer' },
  main:         { padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  titleRow:     { display: 'flex', alignItems: 'center', gap: 10 },
  title:        { fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: 0 },
}