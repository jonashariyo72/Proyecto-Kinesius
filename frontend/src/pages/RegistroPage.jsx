import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registrarCliente } from '../services/authService'

const FORM_INICIAL = {
  nombre: '', apellido: '', dni: '', email: '',
  password: '', confirmar: '',
}

// ─── Validaciones (espeja las reglas del backend) ─────────────────────────────
function validarForm(form) {
  const errores = {}

  if (!form.nombre.trim())
    errores.nombre = 'El nombre es obligatorio.'
  if (!form.apellido.trim())
    errores.apellido = 'El apellido es obligatorio.'
  if (!/^\d{7,8}$/.test(form.dni))
    errores.dni = '“Error al registrar el nuevo usuario porque el DNI ingresado no es válido"'
  if (!form.email) {
    errores.email = 'El correo es obligatorio.'
  } else {
    const dominiosPermitidos = ['gmail.com', 'outlook.com', 'hotmail.com', 'unlp.edu.ar']
    const dominio = form.email.split('@')[1]?.toLowerCase()
    if (!dominiosPermitidos.includes(dominio))
      errores.email = 'Error al registrar el nuevo usuario porque el mail ingresado no es válido  '
  }
  if (form.password.length < 8 || form.password.length > 16)
    errores.password = 'Error al registrar el nuevo usuario porque la contraseña no cumple los requisitos indicados.'
  else if (!/[A-Z]/.test(form.password))
    errores.password = 'Error al registrar el nuevo usuario porque la contraseña no cumple los requisitos indicados'
  else if (!/[!@#$%^&*(),.?":{}|<>]/.test(form.password))
    errores.password = 'Error al registrar el nuevo usuario porque la contraseña no cumple los requisitos indicados'
  if (form.password !== form.confirmar)
    errores.confirmar = 'Error al registrar el nuevo usuario porque la contraseña no cumple los requisitos indicados'

  return errores
}

// ─── Pantalla de éxito ────────────────────────────────────────────────────────
function PantallaExito() {
  return (
    <div className="auth-page">
      <div className="auth-card auth-card--success">
        <div className="success-icon">✓</div>
        <h2 className="auth-title">¡Cuenta creada!</h2>
        <p className="auth-hint">Redirigiendo al inicio de sesión...</p>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function RegistroPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(FORM_INICIAL)
  const [errores, setErrores] = useState({})
  const [errorGlobal, setErrorGlobal] = useState('')
  const [cargando, setCargando] = useState(false)
  const [exito, setExito] = useState(false)

  if (exito) return <PantallaExito />

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
    setErrores((p) => ({ ...p, [name]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorGlobal('')

    const erroresLocales = validarForm(form)
    if (Object.keys(erroresLocales).length > 0) {
      setErrores(erroresLocales)
      return
    }

    setCargando(true)
    try {
      await registrarCliente({
        nombre:   form.nombre,
        apellido: form.apellido,
        dni:      form.dni,
        email:    form.email,
        password: form.password,
      })
      setExito(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        // Errores por campo que viene del backend
        const mapeados = {}
        for (const [campo, msgs] of Object.entries(data)) {
          mapeados[campo] = Array.isArray(msgs) ? msgs[0] : msgs
        }
        setErrores(mapeados)
      } else {
        setErrorGlobal('Error al registrarse. Intentá de nuevo.')
      }
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide">

        <div className="auth-logo">
          <span className="logo-k">K</span>
          <span className="logo-text">INESCIUS</span>
        </div>
        <p className="auth-subtitle">Centro de Rehabilitación</p>
        <h2 className="auth-title">Crear cuenta</h2>

        {errorGlobal && <p className="auth-error">{errorGlobal}</p>}

        <form onSubmit={handleSubmit} className="auth-form">

          <div className="field-row">
            <div className="field">
              <label htmlFor="nombre">Nombre</label>
              <input
                id="nombre" name="nombre" type="text"
                placeholder="Laura"
                value={form.nombre} onChange={handleChange}
              />
              {errores.nombre && <span className="field-error">{errores.nombre}</span>}
            </div>
            <div className="field">
              <label htmlFor="apellido">Apellido</label>
              <input
                id="apellido" name="apellido" type="text"
                placeholder="García"
                value={form.apellido} onChange={handleChange}
              />
              {errores.apellido && <span className="field-error">{errores.apellido}</span>}
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="dni">DNI</label>
              <input
                id="dni" name="dni" type="text"
                placeholder="30123456"
                inputMode="numeric" maxLength={8}
                value={form.dni} onChange={handleChange}
              />
              {errores.dni && <span className="field-error">{errores.dni}</span>}
            </div>
            <div className="field">
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email" name="email" type="email"
                placeholder="laura@email.com"
                value={form.email} onChange={handleChange}
              />
              {errores.email && <span className="field-error">{errores.email}</span>}
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password" name="password" type="password"
                placeholder="••••••••"
                value={form.password} onChange={handleChange}
              />
              {errores.password
                ? <span className="field-error">{errores.password}</span>
                : <span className="field-hint">8–16 caracteres, una mayúscula y un símbolo</span>
              }
            </div>
            <div className="field">
              <label htmlFor="confirmar">Confirmar contraseña</label>
              <input
                id="confirmar" name="confirmar" type="password"
                placeholder="••••••••"
                value={form.confirmar} onChange={handleChange}
              />
              {errores.confirmar && <span className="field-error">{errores.confirmar}</span>}
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={cargando}>
            {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>

        </form>

        <p className="auth-link">
          ¿Ya tenés cuenta? <Link to="/login">Iniciar sesión</Link>
        </p>

      </div>
    </div>
  )
}