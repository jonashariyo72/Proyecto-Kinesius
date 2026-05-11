import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { loginUsuario, verificar2FA } from '../services/authService'
import { useAuth } from '../context/AuthContext'

const rutaPorRol = {
  administrador: '/admin',
  kinesiologo:   '/kinesiologo',
  cliente:       '/cliente',
}

// ─── Paso 1: email y contraseña ──────────────────────────────────────────────
function FormCredenciales({ onRequiere2FA, onError }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [cargando, setCargando] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

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
        navigate(rutaPorRol[data.rol] ?? '/')
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
        <input
          id="password" name="password" type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={form.password}
          onChange={handleChange}
          required
        />
      </div>
      <button type="submit" className="btn-primary" disabled={cargando}>
        {cargando ? 'Ingresando...' : 'Ingresar'}
      </button>
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