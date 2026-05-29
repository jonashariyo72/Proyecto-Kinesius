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
        reservas = Reserva.objects.filter(
            paciente__id=dni,
            estado='CONFIRMADA'
        )
        if not reservas.exists():
            return Response({"detail": "No hay clases disponibles."}, status=status.HTTP_200_OK)
        serializer = self.get_serializer(reservas, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def marcar_asistencia(self, request, pk=None):
        reserva = self.get_object()
        reserva.asistio = True
        reserva.save()
        return Response({"status": "Asistencia registrada"})

    @action(detail=True, methods=['post'])
    def cancelar_reserva(self, request, pk=None):
        try:
            reserva = Reserva.objects.get(id=pk)
        except Reserva.DoesNotExist:
            return Response({"error": "Reserva no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        if reserva.estado == 'CANCELADA':
            return Response({"error": "La reserva ya está cancelada"}, status=status.HTTP_400_BAD_REQUEST)

        # Solo tiene sentido cancelar reservas confirmadas
        if reserva.estado != 'CONFIRMADA':
            return Response({"error": "Solo se pueden cancelar reservas confirmadas."}, status=status.HTTP_400_BAD_REQUEST)

        ahora      = timezone.now()
        diferencia = reserva.fecha_reserva - ahora

        # Obtener lo que el cliente efectivamente pagó
        try:
            pago = reserva.pago  # OneToOne desde PagoReserva
            monto_pagado = pago.monto_abonado
        except Exception:
            monto_pagado = Decimal('0')

        # Más de 24 hs: devuelve todo lo que pagó (haya pagado seña o total)
        # Menos de 24 hs: no se devuelve nada
        if diferencia > timedelta(hours=24):
            saldo = monto_pagado
        else:
            saldo = Decimal('0')

        reserva.saldo_a_favor = saldo
        reserva.estado = 'CANCELADA'
        reserva.save()

        # Notificar al primero en lista de espera
        primer_espera = ListaEspera.objects.filter(clase=reserva.clase).first()
        if primer_espera:
            primer_espera.notificado = True
            primer_espera.fecha_notificacion = timezone.now()
            primer_espera.save()

        return Response(
            {"mensaje": "Reserva cancelada correctamente", "saldo_a_favor": str(saldo)},
            status=status.HTTP_200_OK
        )


class ListaEsperaViewSet(viewsets.ModelViewSet):
    queryset = ListaEspera.objects.all()
    serializer_class = ListaEsperaSerializer

    @action(detail=False, methods=['post'], url_path='inscribirse')
    def inscribirse(self, request):
        paciente_id = request.data.get('paciente')
        clase_id    = request.data.get('clase')

        if not paciente_id or not clase_id:
            return Response(
                {"error": "Se requieren los campos 'paciente' y 'clase'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if ListaEspera.objects.filter(paciente_id=paciente_id, clase_id=clase_id).exists():
            return Response(
                {"error": "Ya estás en la lista de espera para esta clase."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if Reserva.objects.filter(
            paciente_id=paciente_id,
            clase_id=clase_id,
            estado='CONFIRMADA'
        ).exists():
            return Response(
                {"error": "Ya tenés una reserva confirmada para esta clase."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from apps.clases.models import Clase
            clase = Clase.objects.get(id=clase_id)
        except Clase.DoesNotExist:
            return Response({"error": "La clase no existe."}, status=status.HTTP_404_NOT_FOUND)

        if clase.tiene_cupo():
            return Response(
                {"error": "La clase todavía tiene cupos disponibles. Podés reservar directamente."},
                status=status.HTTP_400_BAD_REQUEST
            )

        entrada    = ListaEspera.objects.create(paciente_id=paciente_id, clase_id=clase_id)
        serializer = ListaEsperaSerializer(entrada)
        return Response(
            {"mensaje": "Te inscribiste correctamente a la lista de espera.", "data": serializer.data},
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'])
    def confirmar_cupo(self, request, pk=None):
        espera = self.get_object()

        if not espera.notificado or not espera.fecha_notificacion:
            return Response(
                {"error": "No fuiste notificado para un cupo todavía."},
                status=status.HTTP_400_BAD_REQUEST
            )

        ahora  = timezone.now()
        limite = espera.fecha_notificacion + timedelta(hours=2)

        if ahora > limite:
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

        if not espera.clase.tiene_cupo():
            return Response({"error": "El cupo vacante ya fue ocupado."}, status=status.HTTP_400_BAD_REQUEST)

        # Crear la reserva en PENDIENTE — el cliente deberá pagar para confirmarla
        Reserva.objects.create(
            paciente=espera.paciente,
            clase=espera.clase,
            estado='PENDIENTE'
        )
        espera.delete()

        return Response(
            {"mensaje": "Cupo reservado. Completá el pago para confirmar tu reserva."},
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['get'], url_path='por-clase/(?P<clase_id>[^/.]+)')
    def por_clase(self, request, clase_id=None):
        lista = ListaEspera.objects.filter(clase_id=clase_id).order_by('fecha_inscripcion')

        if not lista.exists():
            return Response(
                {"mensaje": "La lista de espera para el turno seleccionado se encuentra vacía."},
                status=status.HTTP_200_OK
            )

        serializer = ListaEsperaSerializer(lista, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)