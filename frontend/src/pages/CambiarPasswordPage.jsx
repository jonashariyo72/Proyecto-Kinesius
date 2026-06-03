import { useState } from "react";
import { Link } from "react-router-dom";

function CambiarPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMensaje("");

    if (!password || !confirmacion) {
      setError(true);
      setMensaje("Por favor, complete todos los campos");
      return;
    }

    if (password !== confirmacion) {
      setError(true);
      setMensaje("Las contraseñas no coinciden");
      return;
    }

    try {
      const token = sessionStorage.getItem("access");

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
        let mensajeError = "Error al cambiar contraseña";

        if (Array.isArray(data.error)) {
          mensajeError = data.error[0];
        } else if (typeof data.error === "string") {
          mensajeError = data.error;
        }

        throw new Error(mensajeError);
      }

      setError(false);
      setMensaje(data.mensaje);

      setPassword("");
      setConfirmacion("");

    } catch (error) {
      setError(true);
      setMensaje(error.message);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.container}>

        <div style={s.header}>
          <h1 style={s.titulo}>Cambiar contraseña</h1>

          <Link to="/cliente" style={s.linkVolver}>
            ← Volver
          </Link>
        </div>

        <div style={s.card}>
          <p style={s.subtitulo}>
            Ingresá una nueva contraseña segura para tu cuenta.
          </p>

          <form onSubmit={handleSubmit} style={s.form}>

            <div style={s.inputGroup}>
              <label style={s.label}>
                Nueva contraseña
              </label>

              <input
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={s.input}
              />
            </div>

            <div style={s.inputGroup}>
              <label style={s.label}>
                Confirmar contraseña
              </label>

              <input
                type="password"
                placeholder="********"
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                style={s.input}
              />
            </div>

            <button type="submit" style={s.button}>
              Guardar nueva contraseña
            </button>

            {mensaje && (
              <div
                style={{
                  ...s.mensaje,
                  ...(error ? s.error : s.exito),
                }}
              >
                {mensaje}
              </div>
            )}

          </form>
        </div>
      </div>
    </div>
  );
}

export default CambiarPasswordPage;

const s = {
  page: {
    minHeight: "100vh",
    background: "#f5f6f7",
    fontFamily: "sans-serif",
    padding: "2rem",
  },

  container: {
    maxWidth: "500px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  },

  titulo: {
    margin: 0,
    fontSize: "28px",
    fontWeight: "700",
    color: "#1a1a1a",
  },

  linkVolver: {
    textDecoration: "none",
    color: "#2d6a2d",
    fontWeight: "600",
    fontSize: "14px",
  },

  card: {
    background: "#fff",
    border: "1px solid #e5e5e5",
    borderRadius: "14px",
    padding: "2rem",
    boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
  },

  subtitulo: {
    marginTop: 0,
    marginBottom: "1.5rem",
    color: "#666",
    fontSize: "14px",
    lineHeight: 1.5,
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },

  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },

  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#444",
  },

  input: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #dcdcdc",
    fontSize: "14px",
    outline: "none",
  },

  button: {
    marginTop: "0.5rem",
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    background: "#2d6a2d",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },

  mensaje: {
    marginTop: "0.5rem",
    padding: "12px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
  },

  exito: {
    background: "#e8f5e9",
    color: "#2d6a2d",
    border: "1px solid #c3dfc3",
  },

  error: {
    background: "#fdecea",
    color: "#c0392b",
    border: "1px solid #f5c6cb",
  },
};