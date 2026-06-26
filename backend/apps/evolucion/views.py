from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import FichaEvolucion
from .serializers import FichaEvolucionSerializer
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

        # Verificar que sea kinesiólogo
        if not hasattr(request.user, "kinesiologo"):
            return Response(
                {
                    "error": "Solo los kinesiólogos pueden registrar fichas."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        reserva_id = request.data.get("reserva")
        descripcion = request.data.get("descripcion")

        if not reserva_id:
            return Response(
                {
                    "error": "Debe seleccionar una sesión."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not descripcion:
            return Response(
                {
                    "error": "La descripción es obligatoria."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            reserva = Reserva.objects.select_related(
                "paciente",
                "clase"
            ).get(id=reserva_id)

        except Reserva.DoesNotExist:
            return Response(
                {
                    "error": "La sesión no existe."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        # Debe pertenecer al kinesiólogo logueado
        if reserva.clase.kinesiologo != request.user.kinesiologo:
            return Response(
                {
                    "error": "No tiene permisos para registrar esta ficha."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        # Debe haber asistido
        if not reserva.asistio:
            return Response(
                {
                    "error": "El paciente no ha asistido a la sesión."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Evitar duplicados
        if hasattr(reserva, "ficha_evolucion"):
            return Response(
                {
                    "error": "La ficha ya fue registrada."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        FichaEvolucion.objects.create(
            paciente=reserva.paciente,
            kinesiologo=request.user.kinesiologo,
            reserva=reserva,
            descripcion=descripcion
        )

        return Response(
            {
                "mensaje": "Registro de ficha exitoso."
            },
            status=status.HTTP_201_CREATED
        )
    
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
            reserva=reserva,
            observaciones=observaciones
        )

        return Response(
            {"mensaje": "Registro de ficha exitoso"},
            status=status.HTTP_201_CREATED
        )