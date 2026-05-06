from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from datetime import timedelta
from .models import Reserva, ListaEspera
from .serializers import ReservaSerializer, ListaEsperaSerializer
from .permissions import IsOwnerOrAdmin

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

class ListaEsperaViewSet(viewsets.ModelViewSet):
    queryset = ListaEspera.objects.all()
    serializer_class = ListaEsperaSerializer

    @action(detail=True, methods=['post'])
    def confirmar_cupo(self, request, pk=None):
        """
        Lógica de la ventana de 2 horas.
        Verifica si el tiempo de notificación no ha expirado.
        """
        espera = self.get_object()
        
        if not espera.notificado or not espera.fecha_notificacion:
            return Response({"error": "No has sido notificado para un cupo todavía."}, status=status.HTTP_400_BAD_REQUEST)

        ahora = timezone.now()
        limite = espera.fecha_notificacion + timedelta(hours=2)

        if ahora > limite:
            return Response({"error": "El tiempo de 2 horas para confirmar ha expirado."}, status=status.HTTP_403_FORBIDDEN)

        # Si llega a tiempo, se convierte la espera en Reserva
        Reserva.objects.create(
            paciente=espera.paciente,
            clase=espera.clase,
            estado='CONFIRMADA'
        )
        espera.delete() # Se elimina de la lista al confirmar
        return Response({"status": "Reserva confirmada exitosamente."}, status=status.HTTP_201_CREATED)