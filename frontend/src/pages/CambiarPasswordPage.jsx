import { useState } from "react";

function CambiarPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [mensaje, setMensaje] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password || !confirmacion) {
      setMensaje("Por favor, complete todos los campos");
      return;
    }

    if (password !== confirmacion) {
      setMensaje("Las contraseñas no coinciden");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://127.0.0.1:8000/api/usuarios/cambiar-password/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            password,
            confirmar: confirmacion,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setMensaje(data.mensaje);

    } catch (error) {
      setMensaje(error.message);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Cambiar contraseña</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <input
            type="password"
            placeholder="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <input
            type="password"
            placeholder="Confirmar contraseña"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
          />
        </div>

        <button type="submit">
          Restablecer
        </button>
      </form>

      {mensaje && (
        <p style={{ marginTop: "1rem" }}>
          {mensaje}
        </p>
      )}
    </div>
  );
}

export default CambiarPasswordPage;