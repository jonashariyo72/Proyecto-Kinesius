from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from datetime import timedelta
from .models import Reserva, ListaEspera
from .serializers import ReservaSerializer, ListaEsperaSerializer
from .permissions import IsOwnerOrAdmin
from decimal import Decimal


class ReservaViewSet(viewsets.ModelViewSet):
    queryset = Reserva.objects.all()
    serializer_class = ReservaSerializer
    permission_classes = [IsOwnerOrAdmin]

    @action(detail=False, methods=['get'], url_path='mis-turnos/(?P<dni>[^/.]+)')
    def visualizar_grilla(self, request, dni=None):
        """
        HU: VISUALIZAR GRILLA DE TURNOS
        Escenario 1 y 2: Filtra por DNI del cliente.
        """
        reservas = Reserva.objects.filter(paciente__dni=dni, estado='CONFIRMADA')
        if not reservas.exists():
            return Response({"detail": "No hay clases disponibles."}, status=status.HTTP_200_OK)

        serializer = self.get_serializer(reservas, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def marcar_asistencia(self, request, pk=None):
        """
        Lógica para el Kinesiólogo (Registro vía QR)
        """
        reserva = self.get_object()
        reserva.asistio = True
        reserva.save()
        return Response({"status": "Asistencia registrada"})

    @action(detail=True, methods=['post'])
    def cancelar_reserva(self, request, pk=None):

        try:
            reserva = Reserva.objects.get(id=pk)
        except Reserva.DoesNotExist:
            return Response(
                {"error": "Reserva no encontrada"},
                status=status.HTTP_404_NOT_FOUND
            )

        if reserva.estado == 'CANCELADA':
            return Response(
                {"error": "La reserva ya está cancelada"},
                status=status.HTTP_400_BAD_REQUEST
            )

        ahora = timezone.now()
        diferencia = reserva.fecha_reserva - ahora
        precio = reserva.clase.precio
        saldo = 0

        if diferencia > timedelta(hours=24):
            saldo = precio
        else:
            if reserva.tipo_pago == 'TOTAL':
                saldo = precio * Decimal("0.5")

            # pagó seña
            elif reserva.tipo_pago == 'SENIA':
                saldo = 0

        reserva.saldo_a_favor = saldo
        reserva.estado = 'CANCELADA'
        reserva.save()

        primer_espera = ListaEspera.objects.filter(
            clase=reserva.clase
        ).order_by('fecha_inscripcion').first()

        if primer_espera:
            primer_espera.notificado = True
            primer_espera.fecha_notificacion = timezone.now()
            primer_espera.save()

        return Response(
            {
                "mensaje": "Reserva cancelada correctamente",
                "saldo_a_favor": saldo
            },
            status=status.HTTP_200_OK
        )


class ListaEsperaViewSet(viewsets.ModelViewSet):
    queryset = ListaEspera.objects.all()
    serializer_class = ListaEsperaSerializer

    # ------------------------------------------------------------------ #
    # HU #42 - Inscribirse a lista de espera de una sesión
    # Escenario 1: La clase no tiene cupos → se agrega al último lugar
    # ------------------------------------------------------------------ #
    @action(detail=False, methods=['post'], url_path='inscribirse')
    def inscribirse(self, request):
        """
        HU #42 - Inscribirse a lista de espera de una sesión
        Recibe: { paciente: <id>, clase: <id> }
        """
        paciente_id = request.data.get('paciente')
        clase_id    = request.data.get('clase')

        if not paciente_id or not clase_id:
            return Response(
                {"error": "Se requieren los campos 'paciente' y 'clase'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar que no esté ya en la lista para esa clase
        if ListaEspera.objects.filter(paciente_id=paciente_id, clase_id=clase_id).exists():
            return Response(
                {"error": "Ya estás en la lista de espera para esta clase."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar que la clase efectivamente no tiene cupo
        try:
            from apps.clases.models import Clase
            clase = Clase.objects.get(id=clase_id)
        except Clase.DoesNotExist:
            return Response(
                {"error": "La clase no existe."},
                status=status.HTTP_404_NOT_FOUND
            )

        if clase.tiene_cupo():
            return Response(
                {"error": "La clase todavía tiene cupos disponibles. Podés reservar directamente."},
                status=status.HTTP_400_BAD_REQUEST
            )

        entrada = ListaEspera.objects.create(
            paciente_id=paciente_id,
            clase_id=clase_id
        )

        serializer = ListaEsperaSerializer(entrada)
        return Response(
            {
                "mensaje": "Te inscribiste correctamente a la lista de espera.",
                "data": serializer.data
            },
            status=status.HTTP_201_CREATED
        )

    # ------------------------------------------------------------------ #
    # HU #17 - Confirmar turno desde lista de espera
    # Escenario 1: Confirmación exitosa
    # Escenario 2: Confirmación fallida por tiempo expirado (> 2 hs)
    # Escenario 3: Confirmación fallida por falta de cupo
    # ------------------------------------------------------------------ #
    @action(detail=True, methods=['post'])
    def confirmar_cupo(self, request, pk=None):
        """
        HU #17 - Confirmar turno desde lista de espera
        """
        espera = self.get_object()

        # El cliente debe haber sido notificado primero
        if not espera.notificado or not espera.fecha_notificacion:
            return Response(
                {"error": "No fuiste notificado para un cupo todavía."},
                status=status.HTTP_400_BAD_REQUEST
            )

        ahora  = timezone.now()
        limite = espera.fecha_notificacion + timedelta(hours=2)

        # Escenario 2: tiempo expirado
        if ahora > limite:
            # Notificar al siguiente en la lista
            siguiente = ListaEspera.objects.filter(
                clase=espera.clase
            ).exclude(id=espera.id).order_by('fecha_inscripcion').first()

            if siguiente:
                siguiente.notificado = True
                siguiente.fecha_notificacion = timezone.now()
                siguiente.save()

            espera.delete()

            return Response(
                {"error": "Confirmación fallida. El turno ha expirado."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Escenario 3: ya no hay cupo (alguien se adelantó)
        if not espera.clase.tiene_cupo():
            return Response(
                {"error": "El cupo vacante ya fue ocupado."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Escenario 1: confirmación exitosa
        Reserva.objects.create(
            paciente=espera.paciente,
            clase=espera.clase,
            estado='CONFIRMADA'
        )
        espera.delete()

        return Response(
            {"mensaje": "Reserva confirmada exitosamente."},
            status=status.HTTP_201_CREATED
        )

    # ------------------------------------------------------------------ #
        # HU #18 - Visualizar lista de espera
        # Escenario 1: Hay clientes en lista → devuelve el listado
        # Escenario 2: Lista vacía → mensaje informativo
        # ------------------------------------------------------------------ #
    @action(detail=False, methods=['get'], url_path='por-clase/(?P<clase_id>[^/.]+)')
    def por_clase(self, request, clase_id=None):
        """
        HU #18 - Visualizar lista de espera (para el administrador)
        GET /reservas/espera/por-clase/<clase_id>/
        """
        lista = ListaEspera.objects.filter(
            clase_id=clase_id
        ).order_by('fecha_inscripcion')

        # Escenario 2: lista vacía
        if not lista.exists():
            return Response(
                {"mensaje": "La lista de espera para el turno seleccionado se encuentra vacía."},
                status=status.HTTP_200_OK
            )

        # Escenario 1: hay clientes
        serializer = ListaEsperaSerializer(lista, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)