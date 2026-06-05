import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useState } from 'react'

export default function ResponderListaEsperaPage() {

    const { id } = useParams()
    const navigate = useNavigate()

    const [mensaje, setMensaje] = useState('')
    const [error, setError] = useState('')

    const confirmar = () => {
        navigate(`/login?redirect=/lista-espera/pago/${id}`)
    }

    const cancelar = async () => {
        try {
            await axios.post(
                `http://localhost:8000/api/reservas/espera/${id}/rechazar_cupo/`
            )

            setMensaje("Se rechazó el cupo correctamente.")

        } catch (error) {

            setError(
                error.response?.data?.error ||
                'No se pudo rechazar el cupo.'
            )
        }
    }

    return (
        <div className="auth-page">

            <div className="auth-card">

                <h1 className="auth-title">
                    Se liberó un cupo
                </h1>

                <p style={{
                    textAlign: 'center',
                    marginBottom: '10px'
                }}>
                    Tenés un lugar disponible para una sesión que estabas esperando.
                </p>

                <p style={{
                    textAlign: 'center',
                    marginBottom: '30px'
                }}>
                    Disponés de <strong>2 horas</strong> para responder esta solicitud.
                </p>

                <div
                    style={{
                        display: 'flex',
                        gap: '12px'
                    }}
                >

                    <button
                        onClick={confirmar}
                        className="btn-primary"
                        style={{ flex: 1 }}
                    >
                        Confirmar asistencia
                    </button>

                    <button
                        onClick={cancelar}
                        className="btn-secondary"
                        style={{ flex: 1 }}
                    >
                        No asistir
                    </button>

                </div>

                                {mensaje && (
                    <p
                        style={{
                            color: '#2e7d32',
                            textAlign: 'center',
                            marginTop: '20px',
                            fontWeight: '600'
                        }}
                    >
                        {mensaje}
                    </p>
                )}

                {error && (
                    <p
                        style={{
                            color: '#d32f2f',
                            textAlign: 'center',
                            marginTop: '20px',
                            fontWeight: '600'
                        }}
                    >
                        {error}
                    </p>
                )}

            </div>

        </div>
    )
}