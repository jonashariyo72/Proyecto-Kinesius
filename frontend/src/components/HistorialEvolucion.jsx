import { useEffect, useState } from "react";
import { obtenerMisFichas, obtenerFichasPaciente } from "../services/evolucionService";

export default function HistorialEvolucion({ modoKinesiologo = false }) {

    const [fichas, setFichas] = useState([]);
    const [mensaje, setMensaje] = useState("");
    const [dni, setDni] = useState("");
    const [buscando, setBuscando] = useState(false);

    useEffect(() => {

        if (!modoKinesiologo) {
            cargarMisFichas();
        }

    }, []);

    const cargarMisFichas = async () => {

        try {

            const res = await obtenerMisFichas();

            if (res.data.mensaje) {

                setMensaje(res.data.mensaje);
                setFichas([]);

            } else {

                setFichas(res.data);

            }

        }

        catch (err) {

            console.log(err);

        }

    };


    const buscarPaciente = async () => {

        setMensaje("");
        setFichas([]);

        try {

            const res = await obtenerFichasPaciente(dni);

            if (res.data.mensaje) {

                setMensaje(res.data.mensaje);
                setFichas([]);

            }

            else {

                setFichas(res.data);

            }

        }catch (err) {

            setMensaje(
                err.response?.data?.error ||
                "Error del servidor"
            );

        }

    }

    return (

        <div>

            <h2>Mi evolución</h2>

            {modoKinesiologo && (

            <div
                style={{
                    display:"flex",
                    gap:10,
                    marginBottom:20
                }}
            >

                <input
                    placeholder="DNI del paciente"
                    value={dni}
                    onChange={(e)=>setDni(e.target.value)}
                    style={{
                        padding: "10px",
                        borderRadius: 8,
                        border: "1px solid #ccc",
                        width: 220
                    }}
                />

                <button
                    style={{
                        background: "#2d6a2d",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        padding: "10px 18px",
                        cursor: "pointer",
                        fontWeight: 600
                    }}
                    onClick={buscarPaciente}
                >
                    Buscar paciente
                </button>

            </div>

            )}

            {mensaje && (
                <div
                    style={{
                        background:"#fffbea",
                        border:"1px solid #f0d060",
                        color:"#7a5a00",
                        padding:12,
                        borderRadius:8,
                        marginBottom:20
                    }}
                >
                    {mensaje}
                </div>
            )}

            {fichas.map(ficha => (

                <div
                    key={ficha.id}
                    style={{
                        background:"#fff",
                        border:"1px solid #e5e5e5",
                        borderRadius:12,
                        padding:18,
                        marginBottom:15,
                        boxShadow:"0 2px 8px rgba(0,0,0,0.05)"
                    }}
                >

                    <h4 style={{
                        marginTop:0,
                        color:"#2d6a2d"
                    }}>

                        {ficha.fecha} - {ficha.hora}

                    </h4>

                    <p>

                        <strong>Tipo:</strong> {ficha.tipo}

                    </p>

                    <p>

                        <strong>Kinesiólogo:</strong> {ficha.kinesiologo}

                    </p>

                    <p>

                        {ficha.descripcion}

                    </p>

                </div>

            ))}

        </div>

    );

}