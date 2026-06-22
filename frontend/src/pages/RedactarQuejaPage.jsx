import { useState } from 'react'
import { crearQueja } from '../services/quejaService'

export default function RedactarQuejaPage() {

  const [descripcion, setDescripcion] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  async function handleEnviar() {

    try {

      const { data } = await crearQueja(
        descripcion
      )

      setMensaje(data.mensaje)
      setDescripcion('')
      setError('')

    } catch (err) {

      setError(
        err.response?.data?.error ||
        'Error al enviar la queja'
      )
    }
  }

  function handleCancelar() {

    setDescripcion('')
    setMensaje('')
    setError('')
  }

  return (
    <div>

      <h1>Libro de Quejas</h1>

      <textarea
        rows={6}
        value={descripcion}
        onChange={(e) =>
          setDescripcion(e.target.value)
        }
      />

      <br />

      <button onClick={handleEnviar}>
        Enviar queja
      </button>

      <button onClick={handleCancelar}>
        Cancelar operación
      </button>

      {mensaje && (
        <p>{mensaje}</p>
      )}

      {error && (
        <p>{error}</p>
      )}

    </div>
  )
}