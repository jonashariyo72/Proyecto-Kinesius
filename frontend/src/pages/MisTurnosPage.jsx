import { useState } from "react";
import { cancelarReserva } from "../services/reservasService";

function MisTurnosPage() {
  const [mensaje, setMensaje] = useState("");

  // HARDCODEADO por ahora
  const reserva = {
    id: 1,
    clase: "Kinesiología Deportiva",
    fecha: "20/05/2026",
    estado: "CONFIRMADA",
  };

  const handleCancelar = async () => {
    try {
      const data = await cancelarReserva(reserva.id);

      setMensaje(data.mensaje);
    } catch (error) {
      setMensaje(error.message);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Mis Turnos</h1>

      <div
        style={{
          border: "1px solid gray",
          padding: "1rem",
          marginTop: "1rem",
        }}
      >
        <h3>{reserva.clase}</h3>

        <p>Fecha: {reserva.fecha}</p>

        <p>Estado: {reserva.estado}</p>

        <button onClick={handleCancelar}>
          Cancelar turno
        </button>
      </div>

      {mensaje && (
        <p style={{ marginTop: "1rem" }}>
          {mensaje}
        </p>
      )}
    </div>
  );
}

export default MisTurnosPage;