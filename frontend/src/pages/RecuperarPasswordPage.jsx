import { useState } from "react";

function RecuperarPasswordPage() {
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      setMensaje("Por favor, ingrese un correo electrónico");
      return;
    }

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/usuarios/recuperar-password/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al enviar mail");
      }

      setMensaje(data.mensaje);

    } catch (error) {
      setMensaje(error.message);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "#f5f6f7",
      fontFamily: "sans-serif",
    }}>
      <div style={{
        background: "#fff",
        padding: "2rem",
        borderRadius: "12px",
        width: "100%",
        maxWidth: "400px",
        border: "1px solid #e5e5e5",
      }}>
        <h1 style={{
          marginBottom: "1rem",
          fontSize: "24px",
          color: "#1a1a1a",
        }}>
          Recuperar contraseña
        </h1>

        <p style={{
          fontSize: "14px",
          color: "#666",
          marginBottom: "1.5rem",
        }}>
          Ingresá tu correo electrónico y te enviaremos un mail para recuperar tu contraseña.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #ddd",
              marginBottom: "1rem",
              fontSize: "14px",
              boxSizing: "border-box",
            }}
          />

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              background: "#2d6a2d",
              color: "#fff",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Enviar mail de recuperación
          </button>
        </form>

        {mensaje && (
          <p style={{
            marginTop: "1rem",
            fontSize: "14px",
            color: mensaje.includes("Error") ? "#c0392b" : "#2d6a2d",
          }}>
            {mensaje}
          </p>
        )}
      </div>
    </div>
  );
}

export default RecuperarPasswordPage;