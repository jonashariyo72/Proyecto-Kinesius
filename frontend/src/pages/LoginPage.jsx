import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { loginUsuario, verificar2FA } from '../services/authService'
import { useAuth } from '../context/AuthContext'

const rutaPorRol = {
  administrador: '/admin',
  kinesiologo:   '/kinesiologo',
  cliente:       '/cliente',
}

function FormCredenciales({ onRequiere2FA, onError }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [cargando, setCargando] = useState(false)
  const [verPassword, setVerPassword] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const location = useLocation()
  const redirect = new URLSearchParams(location.search).get('redirect')
 
  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
 
  const handleSubmit = async (e) => {
    e.preventDefault()
    onError('')
    setCargando(true)
    try {
      const { data } = await loginUsuario(form.email, form.password)
      if (data.requiere_2fa) {
        // Es admin, pasa al segundo paso
        onRequiere2FA(form.email)
      } else {
        // Es cliente o kinesiólogo, JWT directo
        login(data.access, data.refresh, data.rol)
        navigate(redirect ?? rutaPorRol[data.rol] ?? '/')
      }
    } catch (err) {
      onError(err.response?.data?.error ?? 'Error al iniciar sesión.')
    } finally {
      setCargando(false)
    }
  }
 
  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="field">
        <label htmlFor="email">Correo electrónico</label>
        <input
          id="email" name="email" type="email"
          placeholder="tu@email.com"
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <div style={{ position: 'relative' }}>
          <input
            id="password" name="password" type={verPassword ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            required
            style={{ paddingRight: '2.5rem', width: '100%', boxSizing: 'border-box' }}
          />
          <button
            type="button"
            onClick={() => setVerPassword(v => !v)}
            style={{
              position: 'absolute', right: '10px', top: '50%',
              transform: 'translateY(-50%)', background: 'none',
              border: 'none', cursor: 'pointer', padding: 0,
              color: '#888', display: 'flex', alignItems: 'center',
            }}
            tabIndex={-1}
            aria-label={verPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
          >
            {verPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>
      </div>
      <button type="submit" className="btn-primary" disabled={cargando}>
        {cargando ? 'Ingresando...' : 'Ingresar'}
      </button>
      <p
        style={{
          marginTop: '1rem',
          textAlign: 'center',
          fontSize: '14px',
        }}
      >
        <Link
          to="/recuperar-password"
          style={{
            color: '#2d6a2d',
            textDecoration: 'none',
            fontWeight: '500',
          }}
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
    </form>
  )
}

// ─── Paso 2: código 2FA (solo admin) ─────────────────────────────────────────
function Form2FA({ email, onVolver, onError }) {
  const [codigo, setCodigo] = useState('')
  const [cargando, setCargando] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    onError('')
    setCargando(true)
    try {
      const { data } = await verificar2FA(email, codigo)
      login(data.access, data.refresh, data.rol)
      navigate(rutaPorRol.administrador)
    } catch (err) {
      onError(err.response?.data?.error ?? 'Código incorrecto o expirado.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <p className="auth-hint">
        Enviamos un código de 6 dígitos a <strong>{email}</strong>
      </p>
      <div className="field">
        <label htmlFor="codigo">Código de verificación</label>
        <input
          id="codigo" type="text"
          inputMode="numeric" maxLength={6}
          placeholder="000000"
          className="input-codigo"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
          required
        />
      </div>
      <button type="submit" className="btn-primary" disabled={cargando}>
        {cargando ? 'Verificando...' : 'Confirmar'}
      </button>
      <button type="button" className="btn-ghost" onClick={onVolver}>
        Volver
      </button>
    </form>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function LoginPage() {
  const [emailAdmin, setEmailAdmin] = useState('')
  const [error, setError] = useState('')

  const paso = emailAdmin ? '2fa' : 'credenciales'

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-logo">
          <span className="logo-k">K</span>
          <span className="logo-text">INESCIUS</span>
        </div>
        <p className="auth-subtitle">Centro de Rehabilitación</p>

        {paso === '2fa' && (
          <span className="badge-2fa">🔐 Verificación de administrador</span>
        )}

        <h2 className="auth-title">
          {paso === 'credenciales' ? 'Iniciar sesión' : 'Verificá tu identidad'}
        </h2>

        {error && <p className="auth-error">{error}</p>}

        {paso === 'credenciales' ? (
          <FormCredenciales
            onRequiere2FA={setEmailAdmin}
            onError={setError}
          />
        ) : (
          <Form2FA
            email={emailAdmin}
            onVolver={() => { setEmailAdmin(''); setError('') }}
            onError={setError}
          />
        )}

        {paso === 'credenciales' && (
          <p className="auth-link">
            ¿No tenés cuenta? <Link to="/registro">Registrate</Link>
          </p>
        )}

      </div>
    </div>
  )
}