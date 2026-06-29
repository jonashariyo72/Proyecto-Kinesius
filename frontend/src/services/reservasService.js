import { BASE_URL } from './config'

const API_URL = `${BASE_URL}/reservas`

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