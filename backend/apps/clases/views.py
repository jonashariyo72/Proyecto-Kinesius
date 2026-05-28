from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
from .models import Clase
from .serializers import ClaseSerializer
from apps.reservas.models import Reserva
from apps.pagos.models import PagoReserva


class ClaseViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de clases.

    - Administrador: puede crear, editar, eliminar y ver todo.
    - Kinesiólogo:   solo puede ver sus clases asignadas.
    - Cliente:       solo puede ver clases activas con cupo.
    """
    queryset         = Clase.objects.all()
    serializer_class = ClaseSerializer
    filter_backends  = [DjangoFilterBackend, filters.OrderingFilter]

    # HU#29 - Buscar clase por filtro
    filterset_fields = ['tipo', 'dia', 'activa', 'kinesiologo']
    ordering_fields  = ['dia', 'hora_inicio', 'precio']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user

        if hasattr(user, 'kinesiologo'):
            return Clase.objects.filter(kinesiologo=user.kinesiologo)

        if hasattr(user, 'cliente'):
            return Clase.objects.filter(activa=True)

        return Clase.objects.all()

    def create(self, request, *args, **kwargs):
        if not hasattr(request.user, 'administrador'):
            return Response(
            {'detail': 'Solo los administradores pueden crear clases.'},
            status=status.HTTP_403_FORBIDDEN
        )
        return super().create(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
    

        clase = self.get_object()

        reservas = Reserva.objects.filter(
            clase=clase,
            estado__in=['CONFIRMADA', 'PENDIENTE']
        )

        devueltas = 0
        for reserva in reservas:
            try:
                pago = reserva.pago
                if pago.estado == 'aprobado' and pago.monto_devuelto == 0:
                    pago.monto_devuelto = pago.monto_abonado
                    pago.save()
                    devueltas += 1
            except PagoReserva.DoesNotExist:
                pass

            reserva.estado = 'CANCELADA'
            reserva.save()

        clase.activa = False
        clase.save()

        return Response(
            {'detail': f'Clase desactivada. {devueltas} devoluciones procesadas.'},
            status=status.HTTP_200_OK
        )

    # HU#28 - Visualizar grilla de turnos
    @action(detail=False, methods=['get'], url_path='grilla')
    def grilla(self, request):
        """
        Devuelve las clases activas agrupadas por día para armar la grilla semanal.
        """
        dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
        grilla = {}

        for dia in dias:
            clases_dia = Clase.objects.filter(dia=dia, activa=True).order_by('hora_inicio')
            grilla[dia] = ClaseSerializer(clases_dia, many=True).data

        return Response(grilla)

    # HU#32 - Ver turnos del kinesiólogo autenticado
    @action(detail=False, methods=['get'], url_path='mis-clases')
    def mis_clases(self, request):
        """
        Endpoint exclusivo para el kinesiólogo: devuelve solo sus clases.
        """
        user = request.user
        if not hasattr(user, 'kinesiologo'):
            return Response(
                {'detail': 'Solo disponible para kinesiólogos.'},
                status=status.HTTP_403_FORBIDDEN
            )

        clases = Clase.objects.filter(kinesiologo=user.kinesiologo, activa=True)
        serializer = ClaseSerializer(clases, many=True)
        return Response(serializer.data)
