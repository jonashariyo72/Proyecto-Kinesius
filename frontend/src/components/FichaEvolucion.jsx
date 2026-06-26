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
import api from "../services/clasesService";

export default function FichaEvolucion() {
  const [clases, setClases] = useState([]);
  const [dni, setDni] = useState("");
  const [claseId, setClaseId] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [tratamiento, setTratamiento] = useState("");
  const [observaciones, setObservaciones] = useState("");

  useEffect(() => {
    api
      .get("/clases/mis-clases/")
      .then((res) => setClases(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div style={{ background: "#fff", padding: 25, borderRadius: 12 }}>
      <h2>Registrar ficha de evolución</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>

        <input
          placeholder="DNI del paciente"
          value={dni}
          onChange={(e) => setDni(e.target.value)}
        />

        <select
          value={claseId}
          onChange={(e) => setClaseId(e.target.value)}
        >
          <option value="">Seleccione una clase</option>

          {clases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.fecha_clase} - {c.hora_inicio}
            </option>
          ))}
        </select>

        <textarea
          placeholder="Diagnóstico"
          value={diagnostico}
          onChange={(e) => setDiagnostico(e.target.value)}
        />

        <textarea
          placeholder="Tratamiento"
          value={tratamiento}
          onChange={(e) => setTratamiento(e.target.value)}
        />

        <textarea
          placeholder="Observaciones"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />

        <button>
          Guardar ficha
        </button>

      </div>
    </div>
  );
}