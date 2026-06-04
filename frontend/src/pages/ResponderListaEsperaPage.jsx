import { useParams } from 'react-router-dom'
import axios from 'axios'

export default function ResponderListaEsperaPage() {

    const { id } = useParams()

    const confirmar = async () => {
        await axios.post(
            `http://localhost:8000/api/reservas/espera/${id}/confirmar_cupo/`
        )

        alert("Reserva confirmada")
    }

    const cancelar = async () => {
        await axios.post(
            `http://localhost:8000/api/reservas/espera/${id}/rechazar_cupo/`
        )

        alert("Cancelación confirmada")
    }

    return (
        <div>
            <h1>Se liberó un cupo</h1>

            <p>
                Tenés un lugar disponible para la sesión que estabas esperando.
            </p>

            <button onClick={confirmar}>
                Confirmar asistencia
            </button>

            <button onClick={cancelar}>
                No asistir
            </button>
        </div>
    )
}