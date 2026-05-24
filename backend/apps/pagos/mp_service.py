import os
import mercadopago
from dotenv import load_dotenv

load_dotenv()

SDK_TOKEN = os.environ.get("MP_ACCESS_TOKEN")
sdk = mercadopago.SDK(SDK_TOKEN)


def generar_preferencia_mp(pago_obj):
    """
    Crea una preferencia de pago en MP y devuelve el init_point.
    pago_obj puede ser un PagoReserva real o un PagoMock.

    MP redirige al frontend con query params:
      ?payment_id=...&status=approved&external_reference=<pago_id>
    La página de retorno usa esos params para llamar a /api/pagos/confirmar/.
    """
    # Incluimos el pago_id en las back_urls para que la página de retorno
    # sepa a qué pago corresponde sin depender solo de external_reference
    pago_id = str(pago_obj.id)

    preference_data = {
        "items": [
            {
                "title": f"Pago Reserva Kinescius - ID {pago_obj.reserva.id}",
                "quantity": 1,
                "unit_price": float(pago_obj.monto_abonado),
                "currency_id": "ARS",
            }
        ],
        "payer": {
            "email": pago_obj.cliente.usuario.email,
        },
        "back_urls": {
            "success": f"http://localhost:5173/pago-exitoso?pago_id={pago_id}",
            "failure": f"http://localhost:5173/pago-fallido?pago_id={pago_id}",
            "pending": f"http://localhost:5173/pago-pendiente?pago_id={pago_id}",
        },
        # "auto_return": "approved",  # descomentar en producción para redirigir automáticamente en pagos aprobados
        "external_reference": pago_id,
    }

    # ⚠️ Llamada única — antes estaba duplicada, lo que generaba dos preferencias
    preference_response = sdk.preference().create(preference_data)
    preference = preference_response["response"]

    print("=== RESPUESTA MP ===")
    print(preference_response)
    print("===================")

    return preference.get("init_point")