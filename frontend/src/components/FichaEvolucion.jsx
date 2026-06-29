// import { useEffect, useState } from 'react'
// import { obtenerMisClases } from '../services/claseService'
// import { registrarFicha } from '../services/evolucionService'

// export default function FichaEvolucion() {

//   const [clases, setClases] = useState([])
//   const [dni, setDni] = useState('')
//   const [clase, setClase] = useState('')
//   const [descripcion, setDescripcion] = useState('')
//   const [mensaje, setMensaje] = useState('')
//   const [error, setError] = useState('')

//   useEffect(() => {
//     cargarClases()
//   }, [])

//   async function cargarClases() {
//     try {
//       const res = await obtenerMisClases()
//       setClases(res.data)
//     } catch (err) {
//       console.error(err)
//     }
//   }

//   async function guardar() {

//     setMensaje('')
//     setError('')

//     try {

//       const res = await registrarFicha({
//         dni,
//         clase: clase,
//         descripcion
//       })

//       setMensaje(res.data.mensaje)

//       setDni('')
//       setClase('')
//       setDescripcion('')

//     } catch (err) {

//       if (err.response)
//         setError(err.response.data.error)

//       else
//         setError("Error del servidor")
//     }
//   }

//   return (
//     <div>

//       <h2>Registrar ficha de evolución</h2>

//       <div>

//         <input
//           placeholder="DNI del paciente"
//           value={dni}
//           onChange={e=>setDni(e.target.value)}
//         />

//       </div>

//       <br/>

//       <div>

//         <select
//           value={clase}
//           onChange={e=>setClase(e.target.value)}
//         >

//           <option value="">Seleccione una clase</option>

//           {clases.map(c=>(
//             <option
//               key={c.id}
//               value={c.id}
//             >

//               {c.fecha_clase} - {c.hora_inicio.slice(0,5)}

//             </option>
//           ))}

//         </select>

//       </div>

//       <br/>

//       <textarea
//         rows={8}
//         placeholder="Escriba la evolución..."
//         value={descripcion}
//         onChange={e=>setDescripcion(e.target.value)}
//       />

//       <br/><br/>

//       <button onClick={guardar}>
//         Cargar ficha
//       </button>

//       {mensaje && <p style={{color:"green"}}>{mensaje}</p>}
//       {error && <p style={{color:"red"}}>{error}</p>}

//     </div>
//   )

// }

import { useEffect, useState } from "react";
import {
    buscarPaciente,
    registrarFicha
} from "../services/evolucionService";

export default function FichaEvolucion() {
  const [clases, setClases] = useState([]);
  const [dni, setDni] = useState("");
  const [paciente, setPaciente] = useState(null);
  const [claseId, setClaseId] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [tratamiento, setTratamiento] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const buscar = async () => {
    try {
        const res = await buscarPaciente(dni)

        setPaciente(res.data.paciente)
        setClases(res.data.sesiones)
    } catch (err) {
        setPaciente(null)
        setClases([])
        setError(err.response?.data?.error || "Paciente no registrado.")
    }
  }

  const guardar = async () => {
    try {

        await registrarFicha({
            dni,
            reserva_id: claseId,
            observaciones
        })

        setMensaje("Registro de ficha exitoso")
        setError("")

        setPaciente(null)
        setClases([])
        setClaseId("")
        setDiagnostico("")
        setTratamiento("")
        setObservaciones("")
        setDni("")
        buscar()

    } catch (err) {
        setMensaje("")
        setError(err.response?.data?.error || "Error del servidor")
    }
  }

  const s = {
    botonBuscar: {
      padding: "10px 18px",
      borderRadius: 8,
      border: "none",
      background: "#2d6a2d",
      color: "#fff",
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      width: "fit-content",
    },

    botonGuardar: {
      padding: "12px",
      borderRadius: 8,
      border: "none",
      background: "#2d6a2d",
      color: "#fff",
      fontSize: 15,
      fontWeight: 600,
      cursor: "pointer",
    },

    input: {
      padding: "10px",
      borderRadius: 8,
      border: "1px solid #ddd",
      fontSize: 14,
    },

    textarea: {
      padding: "10px",
      borderRadius: 8,
      border: "1px solid #ddd",
      fontSize: 14,
      minHeight: 120,
      resize: "vertical",
    },

    select: {
      padding: "10px",
      borderRadius: 8,
      border: "1px solid #ddd",
      fontSize: 14,
    },
  }

  return (
    <div style={{ background: "#fff", padding: 25, borderRadius: 12 }}>
      <h2>Registrar ficha de evolución</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>

        <input
          style={s.input}
          placeholder="DNI del paciente"
          value={dni}
          onChange={(e) => setDni(e.target.value)}
        />

        <button
            style={s.botonBuscar}
            onClick={buscar}
        >
            Buscar paciente
        </button>

        {paciente && (
            <div
                style={{
                    background: "#eef8ee",
                    padding: 10,
                    borderRadius: 8
                }}
            >
                <strong>Paciente:</strong>{" "}
                {paciente.nombre} {paciente.apellido}
            </div>
        )}

        {paciente && clases.length > 0 && (

        <select
            style={s.select}
            value={claseId}
            onChange={(e) => setClaseId(e.target.value)}
        >
            <option value="">
                Seleccione una clase
            </option>

            {clases.map((c) => (
                <option
                    key={c.id}
                    value={c.id}
                >
                    {c.fecha} - {c.hora} ({c.tipo})
                </option>
            ))}
        </select>

        )}


        {paciente && clases.length === 0 && (
            <p style={{ color: "#666" }}>
                El paciente no posee sesiones pendientes para registrar evolución.
            </p>
        )}
        
        <textarea
          style={s.textarea}
          placeholder="Observaciones"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />

        <button style={s.botonGuardar} onClick={guardar} disabled={!claseId}>
            Guardar ficha
        </button>

        {mensaje && (
            <p style={{ color: "green" }}>
                {mensaje}
            </p>
        )}

        {error && (
            <p style={{ color: "red" }}>
                {error}
            </p>
        )}

      </div>
    </div>
  );

  // const s = {
  //   botonBuscar: {
  //     padding: "10px 18px",
  //     borderRadius: 8,
  //     border: "none",
  //     background: "#2d6a2d",
  //     color: "#fff",
  //     fontSize: 14,
  //     fontWeight: 600,
  //     cursor: "pointer",
  //     width: "fit-content",
  //   },

  //   botonGuardar: {
  //     padding: "12px",
  //     borderRadius: 8,
  //     border: "none",
  //     background: "#2d6a2d",
  //     color: "#fff",
  //     fontSize: 15,
  //     fontWeight: 600,
  //     cursor: "pointer",
  //   },

  //   input: {
  //     padding: "10px",
  //     borderRadius: 8,
  //     border: "1px solid #ddd",
  //     fontSize: 14,
  //   },

  //   textarea: {
  //     padding: "10px",
  //     borderRadius: 8,
  //     border: "1px solid #ddd",
  //     fontSize: 14,
  //     minHeight: 120,
  //     resize: "vertical",
  //   },

  //   select: {
  //     padding: "10px",
  //     borderRadius: 8,
  //     border: "1px solid #ddd",
  //     fontSize: 14,
  //   },
  // }

}

