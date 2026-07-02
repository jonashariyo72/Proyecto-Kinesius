import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { obtenerEstadisticasMeses, obtenerClientesFiltrados } from "../services/estadisticasService";
import "../styles/estadisticas.css";

const FILTROS = [
    { value: "asistencia", label: "Mayor asistencia" },
    { value: "ingreso", label: "Mayor ingreso" },
    { value: "abonados", label: "Abonados nuevos" },
];

const ETIQUETAS = {
    asistencia: { titulo: "Meses con mayor asistencia", campo: "cantidad", sufijo: "asist." },
    ingreso: { titulo: "Meses con mayor ingreso", campo: "total", sufijo: "$" },
    abonados: { titulo: "Meses con más abonados nuevos", campo: "cantidad", sufijo: "" },
};

const formatearValor = (valor, tipo) => {
    if (tipo === "ingreso") {
        return new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS",
            maximumFractionDigits: 0,
        }).format(valor);
    }
    return valor;
};

const formatearFechaISO = (date) => {
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

export default function EstadisticasMeses() {
    const [tipo, setTipo] = useState("asistencia");
    const [datos, setDatos] = useState([]);
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");
    const [cargando, setCargando] = useState(false);
    const [consultado, setConsultado] = useState(false);

    // Filtro de clientes por abonado/asistencia (HU: filtrar clientes)
    const [estadoPago, setEstadoPago] = useState("");
    const [asistencia, setAsistencia] = useState("");
    const [fecha, setFecha] = useState(null);
    const [clientes, setClientes] = useState([]);
    const [resumenClientes, setResumenClientes] = useState(null);
    const [mensajeClientes, setMensajeClientes] = useState("");
    const [errorClientes, setErrorClientes] = useState("");
    const [cargandoClientes, setCargandoClientes] = useState(false);

    const handleVisualizar = async () => {
        setCargando(true);
        setError("");
        setMensaje("");
        setDatos([]);

        try {
            const response = await obtenerEstadisticasMeses(tipo);

            // El backend devuelve { mensaje: "..." } cuando no hay resultados (Escenario 4)
            if (response.data && response.data.mensaje) {
                setMensaje(response.data.mensaje);
            } else {
                setDatos(response.data);
            }
        } catch (err) {
            setError("Ocurrió un error al obtener las estadísticas.");
        } finally {
            setCargando(false);
            setConsultado(true);
        }
    };

    const etiqueta = ETIQUETAS[tipo];
    const maximo = datos.length > 0 ? Math.max(...datos.map((d) => d[etiqueta.campo])) : 0;

    const handleFiltrarClientes = async () => {
        // Escenario 2 exige fecha cuando se filtra por asistencia
        if (asistencia && !fecha) {
            setErrorClientes("Debe ingresar una fecha para filtrar por asistencia.");
            setClientes([]);
            setResumenClientes(null);
            setMensajeClientes("");
            return;
        }

        setCargandoClientes(true);
        setErrorClientes("");
        setMensajeClientes("");
        setClientes([]);
        setResumenClientes(null);

        try {
            const response = await obtenerClientesFiltrados(estadoPago, asistencia, formatearFechaISO(fecha));
            const { resumen, mensaje, clientes: lista } = response.data;

            setResumenClientes(resumen || null);

            if (mensaje) {
                setMensajeClientes(mensaje);
            } else {
                setClientes(lista || []);
            }
        } catch (err) {
            const msg = err.response?.data?.error || "Ocurrió un error al filtrar los clientes.";
            setErrorClientes(msg);
        } finally {
            setCargandoClientes(false);
        }
    };

    return (
        <div className="estadisticas-page">
            <h1 className="estadisticas-titulo">Estadísticas del centro</h1>

            <div className="estadisticas-card">
                <div className="estadisticas-filtros">
                    <select
                        className="estadisticas-select"
                        value={tipo}
                        onChange={(e) => setTipo(e.target.value)}
                    >
                        {FILTROS.map((f) => (
                            <option key={f.value} value={f.value}>
                                {f.label}
                            </option>
                        ))}
                    </select>

                    <button
                        className="estadisticas-btn"
                        onClick={handleVisualizar}
                        disabled={cargando}
                    >
                        {cargando ? "Cargando..." : "Visualizar estadística"}
                    </button>
                </div>
            </div>

            {error && <div className="estadisticas-error">{error}</div>}

            {cargando && (
                <div className="estadisticas-resultados-card">
                    <div className="estadisticas-spinner-wrap">
                        <div className="estadisticas-spinner" />
                        <p>Cargando estadísticas...</p>
                    </div>
                </div>
            )}

            {!cargando && consultado && !error && (
                <div className="estadisticas-resultados-card">
                    <h2 className="estadisticas-resultados-titulo">{etiqueta.titulo}</h2>

                    {mensaje && <p className="estadisticas-vacio">{mensaje}</p>}

                    {datos.length > 0 && (
                        <div className="estadisticas-chart-wrap">
                            {datos.map((fila) => {
                                const valor = fila[etiqueta.campo];
                                const porcentaje = maximo > 0 ? (valor / maximo) * 100 : 0;

                                return (
                                    <div className="estadisticas-bar-row" key={fila.mes}>
                                        <span className="estadisticas-bar-mes">
                                            {fila.mes_nombre}
                                        </span>

                                        <div className="estadisticas-bar-track">
                                            <div
                                                className={`estadisticas-bar-fill estadisticas-bar-fill--${tipo}`}
                                                style={{ width: `${porcentaje}%` }}
                                            />
                                        </div>

                                        <span className="estadisticas-bar-valor">
                                            {formatearValor(valor, tipo)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            <hr className="estadisticas-divisor" />

            <h2 className="estadisticas-subtitulo">Filtrar clientes</h2>

            <div className="estadisticas-card">
                <div className="estadisticas-filtros-clientes">
                    <select
                        className="estadisticas-select"
                        value={estadoPago}
                        onChange={(e) => setEstadoPago(e.target.value)}
                    >
                        <option value="">Estado de pago (todos)</option>
                        <option value="abonado">Abonado</option>
                        <option value="no_abonado">No abonado</option>
                    </select>

                    <select
                        className="estadisticas-select"
                        value={asistencia}
                        onChange={(e) => setAsistencia(e.target.value)}
                    >
                        <option value="">Asistencia (sin filtro)</option>
                        <option value="asistio">Asistió</option>
                        <option value="no_asistio">No asistió</option>
                    </select>

                    <div className="estadisticas-date-wrap">
                        <DatePicker
                            selected={fecha}
                            onChange={(date) => setFecha(date)}
                            className="estadisticas-date-input"
                            placeholderText="Seleccioná una fecha"
                            dateFormat="dd/MM/yyyy"
                            disabled={!asistencia}
                            isClearable
                        />
                    </div>

                    <button
                        className="estadisticas-btn"
                        onClick={handleFiltrarClientes}
                        disabled={cargandoClientes}
                    >
                        {cargandoClientes ? "Filtrando..." : "Aplicar filtro"}
                    </button>
                </div>
            </div>

            {errorClientes && <div className="estadisticas-error">{errorClientes}</div>}

            {cargandoClientes && (
                <div className="estadisticas-resultados-card">
                    <div className="estadisticas-spinner-wrap">
                        <div className="estadisticas-spinner" />
                        <p>Buscando clientes...</p>
                    </div>
                </div>
            )}

            {!cargandoClientes && (mensajeClientes || clientes.length > 0) && (
                <div className="estadisticas-resultados-card">
                    {resumenClientes && (
                        <div className="estadisticas-resumen-row">
                            <div className="estadisticas-resumen-chip">
                                <strong>{resumenClientes.total_clientes}</strong>
                                Total clientes
                            </div>
                            <div className="estadisticas-resumen-chip">
                                <strong>{resumenClientes.abonados}</strong>
                                Abonados
                            </div>
                            <div className="estadisticas-resumen-chip">
                                <strong>{resumenClientes.no_abonados}</strong>
                                No abonados
                            </div>
                        </div>
                    )}

                    {mensajeClientes && <p className="estadisticas-vacio">{mensajeClientes}</p>}

                    {clientes.length > 0 && (
                        <div className="estadisticas-tabla-wrap">
                            <table className="estadisticas-tabla">
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>DNI</th>
                                        <th>Email</th>
                                        <th>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clientes.map((c) => (
                                        <tr key={c.id}>
                                            <td>{c.nombre} {c.apellido}</td>
                                            <td>{c.dni}</td>
                                            <td>{c.email}</td>
                                            <td>
                                                <span
                                                    className={`estadisticas-badge ${
                                                        c.es_abonado
                                                            ? "estadisticas-badge--abonado"
                                                            : "estadisticas-badge--no-abonado"
                                                    }`}
                                                >
                                                    {c.es_abonado ? "Abonado" : "No abonado"}
                                                </span>
                                                {c.suspendido && (
                                                    <span className="estadisticas-badge estadisticas-badge--suspendido">
                                                        Suspendido
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
