import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function ResetPasswordPage() {

  const [searchParams] = useSearchParams()
  const email = searchParams.get('email')

  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()

    setMensaje('')
    setError('')

    try {

      const res = await axios.post(
        'http://127.0.0.1:8000/api/usuarios/reset-password/',
        {
          email,
          password,
          confirmar
        }
      )

      setMensaje(res.data.mensaje)

      setTimeout(() => {
        navigate('/login')
      }, 2000)

    } catch (err) {

      setError(
        err.response?.data?.error ||
        'Error al cambiar la contraseña'
      )
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        <h1 className="auth-title">
          Nueva contraseña
        </h1>

        <form onSubmit={handleSubmit} className="auth-form">

          <input
            type="password"
            placeholder="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Confirmar contraseña"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            required
          />

          <button type="submit" className="btn-primary">
            Cambiar contraseña
          </button>

        </form>

        {mensaje && (
          <p style={{ color: 'green' }}>
            {mensaje}
          </p>
        )}

        {error && (
          <p className="auth-error">
            {error}
          </p>
        )}

      </div>
    </div>
  )
}