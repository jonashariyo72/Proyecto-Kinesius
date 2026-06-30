import { useState } from 'react'
import {
    buscarPaciente,
    registrarFicha
}
from '../services/evolucionService'

export default function RegistrarEvolucion() {

    const [dni, setDni] = useState('')
    const [paciente, setPaciente] = useState(null)
    const [reservas, setReservas] = useState([])
    const [reservaSeleccionada, setReservaSeleccionada] = useState('')
    const [observaciones, setObservaciones] = useState('')
    const buscar = async () => {

    try{

        const res = await buscarPaciente(dni)

        setPaciente(res.data.paciente)
        setReservas(res.data.reservas)

    }

    catch(error){

        alert(
            error.response?.data?.error ??
            'Error al buscar paciente.'
        )

    }

}

    return (
        <div style={s.container}>

            <h2>Registrar ficha de evolución</h2>

            <input
                style={s.input}
                placeholder="DNI del paciente"
                value={dni}
                onChange={(e)=>setDni(e.target.value)}
            />

            <button
                style={s.boton}
                onClick={buscar}
            >
                Buscar
            </button>

        </div>
    )
}

const s = {

    container:{
        background:'#fff',
        padding:'2rem',
        borderRadius:12,
        display:'flex',
        flexDirection:'column',
        gap:15
    },

    input:{
        padding:10,
        border:'1px solid #ddd',
        borderRadius:8
    },

    boton:{
        padding:10,
        background:'#2d6a2d',
        color:'white',
        border:'none',
        borderRadius:8,
        cursor:'pointer'
    }

}