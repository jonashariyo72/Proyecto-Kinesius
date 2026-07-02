from rest_framework.views import APIView
from rest_framework.response import Response

from django.db.models import Count, Sum, Min
from django.db.models.functions import ExtractMonth

from apps.reservas.models import Reserva
from apps.pagos.models import PagoReserva, PagoCuota


MESES_ES = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
    5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
    9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
}

MENSAJE_SIN_RESULTADOS = {"mensaje": "No hay resultados para el filtro seleccionado"}

FILTROS_VALIDOS = ("asistencia", "ingreso", "abonados")


class EstadisticasMesesView(APIView):
    """
    HU: Como Administrador quiero visualizar estadísticas del centro por meses.

    GET /estadisticas/meses/?filtro=asistencia|ingreso|abonados
    """

    def get(self, request):
        filtro = request.query_params.get("filtro")

        if filtro not in FILTROS_VALIDOS:
            return Response({"error": "Filtro inválido"}, status=400)

        if filtro == "asistencia":
            datos = self._estadistica_asistencia()
        elif filtro == "ingreso":
            datos = self._estadistica_ingreso()
        else:  # abonados
            datos = self._estadistica_abonados()

        # Escenario 4: sin resultados (aplicado a los 3 filtros por consistencia)
        if not datos:
            return Response(MENSAJE_SIN_RESULTADOS)

        return Response(datos)

    # Escenario 1: Mayor Asistencia
    def _estadistica_asistencia(self):
        estadisticas = (
            Reserva.objects.filter(
                asistio=True,
                estado="CONFIRMADA",
                fecha_asistencia__isnull=False,
            )
            .annotate(mes=ExtractMonth("fecha_asistencia"))
            .values("mes")
            .annotate(cantidad=Count("id"))
            .order_by("-cantidad")
        )

        return [
            {
                "mes": e["mes"],
                "mes_nombre": MESES_ES.get(e["mes"], e["mes"]),
                "cantidad": e["cantidad"],
            }
            for e in estadisticas
        ]

    # Escenario 2: Mayor Ingreso
    def _estadistica_ingreso(self):
        estadisticas = (
            PagoReserva.objects.filter(estado="aprobado")
            .annotate(mes=ExtractMonth("creado_en"))
            .values("mes")
            .annotate(total=Sum("monto_abonado"))
            .order_by("-total")
        )

        return [
            {
                "mes": e["mes"],
                "mes_nombre": MESES_ES.get(e["mes"], e["mes"]),
                "total": e["total"],
            }
            for e in estadisticas
        ]

    # Escenario 3: Abonados nuevos
    def _estadistica_abonados(self):
        primeros_pagos = (
            PagoCuota.objects.filter(estado="aprobado")
            .values("cliente")
            .annotate(primer_pago=Min("creado_en"))
        )

        meses = {}
        for pago in primeros_pagos:
            mes = pago["primer_pago"].month
            meses[mes] = meses.get(mes, 0) + 1

        datos = [
            {"mes": mes, "mes_nombre": MESES_ES.get(mes, mes), "cantidad": cantidad}
            for mes, cantidad in meses.items()
        ]
        datos.sort(key=lambda x: x["cantidad"], reverse=True)

        return datos
