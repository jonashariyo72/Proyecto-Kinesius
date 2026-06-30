from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import FichaEvolucion
from .serializers import FichaEvolucionSerializer
from .serializers import FichaVisualizacionSerializer
from apps.usuarios.models import Cliente
from apps.reservas.models import Reserva


from apps.usuarios.models import Cliente
from apps.reservas.models import Reserva


class BuscarPacienteView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        dni = request.GET.get("dni")

        if not dni:
            return Response(
                {"error": "Debe ingresar un DNI."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            paciente = Cliente.objects.select_related("usuario").get(
                usuario__dni=dni
            )
        except Cliente.DoesNotExist:
            return Response(
                {"error": "Paciente no registrado."},
                status=status.HTTP_404_NOT_FOUND
            )

        reservas = Reserva.objects.filter(
            paciente=paciente,
            estado="CONFIRMADA",
            asistio=True,
            ficha_evolucion__isnull=True,
            clase__kinesiologo=request.user.kinesiologo
        ).exclude(
            ficha_evolucion__isnull=False
        ).select_related(
            "clase"
        )

        sesiones = []

        for reserva in reservas:
            sesiones.append({
                "id": reserva.id,
                "fecha": reserva.clase.fecha_clase,
                "hora": reserva.clase.hora_inicio,
                "tipo": reserva.clase.get_tipo_display(),
            })

        return Response({
            "paciente": {
            "id": paciente.id,
            "nombre": paciente.usuario.nombre,
            "apellido": paciente.usuario.apellido,
            "dni": paciente.usuario.dni,
        },
            "sesiones": sesiones
        })
    

class RegistrarFichaView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        if not hasattr(request.user, 'kinesiologo'):
            return Response(
                {"error": "Solo los kinesiólogos pueden registrar fichas."},
                status=status.HTTP_403_FORBIDDEN
            )

        dni = request.data.get("dni")
        reserva_id = request.data.get("reserva_id")
        observaciones = request.data.get("observaciones")

        try:
            cliente = Cliente.objects.get(usuario__dni=dni)
        except Cliente.DoesNotExist:
            return Response(
                {"error": "Paciente no registrado."},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            reserva = Reserva.objects.get(
                id=reserva_id,
                paciente=cliente,
                asistio=True,
                estado="CONFIRMADA",
                clase__kinesiologo=request.user.kinesiologo
            )
        except Reserva.DoesNotExist:
            return Response(
                {"error": "El paciente no asistió a esa fecha."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if hasattr(reserva, "ficha_evolucion"):
            return Response(
                {"error": "La ficha de esa sesión ya fue registrada."},
                status=status.HTTP_400_BAD_REQUEST
            )

        FichaEvolucion.objects.create(
            paciente=cliente,
            kinesiologo=request.user.kinesiologo,
            reserva=reserva,
            descripcion=observaciones
        )

        return Response(
            {"mensaje": "Registro de ficha exitoso"},
            status=status.HTTP_201_CREATED
        )
    
class MisFichasView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        if not hasattr(request.user, "cliente"):
            return Response(
                {
                    "error": "Solo los clientes pueden acceder."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        fichas = FichaEvolucion.objects.filter(
            paciente=request.user.cliente
        ).order_by("-fecha_creacion")

        if not fichas.exists():
            return Response(
                {
                    "mensaje": "Paciente sin ficha de evolución"
                }
            )

        serializer = FichaVisualizacionSerializer(
            fichas,
            many=True
        )

        return Response(serializer.data)
    
class FichasPacienteView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        if not hasattr(request.user, "kinesiologo"):
            return Response(
                {
                    "error": "Solo los kinesiólogos pueden acceder."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        dni = request.GET.get("dni")

        if not dni:
            return Response(
                {
                    "error": "Debe ingresar un DNI."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            paciente = Cliente.objects.get(
                usuario__dni=dni
            )

        except Cliente.DoesNotExist:
            return Response(
                {
                    "error": "Paciente no registrado."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        fichas = FichaEvolucion.objects.filter(
            paciente=paciente
        ).order_by("-fecha_creacion")

        if not fichas.exists():
            return Response(
                {
                    "mensaje": "Paciente sin ficha de evolución"
                }
            )

        serializer = FichaVisualizacionSerializer(
            fichas,
            many=True
        )

        return Response(serializer.data)