import { useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

export default function ListaEsperaConfirmarPage() {

  const { id } = useParams()

  const [mensaje, setMensaje] = useState('')
  const [procesando, setProcesando] = useState(false)

  const confirmar = async () => {

    setProcesando(true)

    try {

      const res = await axios.post(
        `http://localhost:8000/api/reservas/espera/${id}/confirmar_cupo/`
      )

      setMensaje(res.data.mensaje)

    } catch (err) {

      setMensaje(
        err.response?.data?.error ||
        'Ocurrió un error.'
      )

    } finally {
      setProcesando(false)
    }
  }

  return (
    <div style={{ padding: '2rem' }}>

      <h2>Confirmación de turno</h2>

      {!mensaje ? (
        <>
          <p>
            Se liberó un cupo para una sesión que estabas esperando.
          </p>

          <button
            onClick={confirmar}
            disabled={procesando}
          >
            Confirmar asistencia
          </button>
        </>
      ) : (
        <p>{mensaje}</p>
      )}

    </div>
  )
}