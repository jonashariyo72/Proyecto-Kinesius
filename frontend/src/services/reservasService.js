const API_URL = "http://127.0.0.1:8000/api/reservas";

export async function cancelarReserva(id) {
  const response = await fetch(
    `${API_URL}/gestion/${id}/cancelar_reserva/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al cancelar reserva");
  }

  return data;
}