from rest_framework.views import APIView
from rest_framework.response import Response

from django.db.models import Count
from django.db.models.functions import ExtractMonth

from apps.reservas.models import Reserva
from django.db.models import Sum
from apps.pagos.models import PagoReserva


class EstadisticasMesesView(APIView):

    def get(self, request):

        filtro = request.query_params.get("filtro")

        if filtro == "asistencia":

            estadisticas = (
                Reserva.objects.filter(
                    asistio=True,
                    estado="CONFIRMADA"
                )
                .annotate(
                    mes=ExtractMonth("fecha_asistencia")
                )
                .values("mes")
                .annotate(
                    cantidad=Count("id")
                )
                .order_by("-cantidad")
            )

            return Response(estadisticas)
        if filtro == "ingreso":

                estadisticas = (
                    PagoReserva.objects.filter(
                        estado="aprobado"
                    )
                    .annotate(
                        mes=ExtractMonth("creado_en")
                    )
                    .values("mes")
                    .annotate(
                        total=Sum("monto_abonado")
                    )
                    .order_by("-total")
                )

                return Response(estadisticas)
        else:
            return Response({
                "error": "Filtro inválido"
            }, status=400)