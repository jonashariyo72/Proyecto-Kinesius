import { useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

export default function ListaEsperaCancelarPage() {

  const { id } = useParams()

  const [mensaje, setMensaje] = useState('')
  const [procesando, setProcesando] = useState(false)

  const cancelar = async () => {

    setProcesando(true)

    try {

      const res = await axios.post(
        `http://localhost:8000/api/reservas/espera/${id}/rechazar_cupo/`
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
            ¿Deseás rechazar este cupo?
          </p>

          <button
            onClick={cancelar}
            disabled={procesando}
          >
            No asistir
          </button>
        </>
      ) : (
        <p>{mensaje}</p>
      )}

    </div>
  )
}