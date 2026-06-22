from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Queja
from .serializers import QuejaSerializer


class QuejaViewSet(viewsets.ModelViewSet):

    queryset = Queja.objects.all()
    serializer_class = QuejaSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):

        cliente = getattr(request.user, 'cliente', None)

        if not cliente:
            return Response(
                {'error': 'Solo los clientes pueden registrar quejas.'},
                status=status.HTTP_403_FORBIDDEN
            )

        descripcion = request.data.get('descripcion')

        if not descripcion:
            return Response(
                {'error': 'La descripción es obligatoria.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        Queja.objects.create(
            cliente=cliente,
            descripcion=descripcion
        )

        return Response(
            {
                'mensaje':
                'Su nota ha sido añadida al libro de quejas con éxito'
            },
            status=status.HTTP_201_CREATED
        )

    def list(self, request, *args, **kwargs):

        quejas = Queja.objects.all().order_by('-fecha_creacion')

        if not quejas.exists():
            return Response(
                {
                    'mensaje': 'No hay quejas'
                }
            )

        serializer = self.get_serializer(
            quejas,
            many=True
        )

        return Response(serializer.data)