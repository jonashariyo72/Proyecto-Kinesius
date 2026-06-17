import { useEffect, useState } from 'react'
import { obtenerQuejas } from '../services/quejaService'

export default function ListaQuejasAdminPage() {

  const [quejas, setQuejas] = useState([])
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {

    async function cargar() {

      const { data } =
        await obtenerQuejas()

      if (data.mensaje) {
        setMensaje(data.mensaje)
      } else {
        setQuejas(data)
      }
    }

    cargar()

  }, [])

  return (
    <div>

      <h1>Quejas de Clientes</h1>

      {mensaje && (
        <p>{mensaje}</p>
      )}

      {quejas.map((queja) => (

        <div
          key={queja.id}
          style={{
            border: '1px solid gray',
            padding: '10px',
            marginBottom: '10px'
          }}
        >
          <p>
            {queja.descripcion}
          </p>

          <small>
            {queja.fecha_creacion}
          </small>

        </div>

      ))}

    </div>
  )
}