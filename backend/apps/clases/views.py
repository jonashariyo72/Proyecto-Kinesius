from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
from .models import Clase
from .serializers import ClaseSerializer


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
            # Solo administradores pueden crear/editar/eliminar (HU#13, #15, #27)
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user

        # HU#32 - El kinesiólogo solo ve sus clases asignadas
        if hasattr(user, 'kinesiologo'):
            return Clase.objects.filter(kinesiologo=user.kinesiologo)

        # Clientes solo ven clases activas
        if hasattr(user, 'cliente'):
            return Clase.objects.filter(activa=True)

        # Administrador ve todo
        return Clase.objects.all()

    def destroy(self, request, *args, **kwargs):
        """
        HU#27 - Eliminar clase.
        Hace un soft delete: marca la clase como inactiva en vez de borrarla,
        para no perder el historial de reservas asociadas.
        """
        clase = self.get_object()
        clase.activa = False
        clase.save()
        return Response(
            {'detail': 'Clase desactivada correctamente.'},
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
