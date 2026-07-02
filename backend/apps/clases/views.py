from datetime import date, datetime, timedelta
from django.utils import timezone
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.views import APIView
from .models import Clase
from .serializers import ClaseSerializer
from apps.reservas.models import Reserva
from apps.pagos.models import PagoReserva
import base64
import qrcode
import uuid
import io
from django.db.models import Q

class ClaseViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de clases.

    - Administrador: puede crear, editar, eliminar y ver todo.
    - Kinesiólogo:   solo puede ver sus clases asignadas.
    - Cliente:       solo puede ver clases activas con cupo
                         y dentro de los próximos 7 días.
    """

    queryset = Clase.objects.all()
    serializer_class = ClaseSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]

    # HU#29 - Buscar clase por filtro
    filterset_fields = ['tipo', 'dia', 'activa', 'kinesiologo']
    ordering_fields = ['dia', 'hora_inicio', 'precio']

    def get_permissions(self):
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user

        # KINESIÓLOGO
        if hasattr(user, 'kinesiologo'):
            return Clase.objects.filter(
                kinesiologo=user.kinesiologo
            )

         # CLIENTE
        if hasattr(user, 'cliente'):
            ahora = timezone.localtime()
            hoy = ahora.date()
            hora_actual = ahora.time()
            limite = hoy + timedelta(days=7)

            return Clase.objects.filter(
                activa=True,
                fecha_clase__gte=hoy,
                fecha_clase__lte=limite
            ).filter(
                Q(fecha_clase__gt=hoy) |
                Q(fecha_clase=hoy, hora_inicio__gt=hora_actual)
            ).order_by(
                'fecha_clase',
                'hora_inicio'
            )

        # ADMIN
        return Clase.objects.all().order_by(
            'fecha_clase',
            'hora_inicio'
        )

    def create(self, request, *args, **kwargs):
        if not hasattr(request.user, 'administrador'):
            return Response(
                {
                    'detail':
                    'Solo los administradores pueden crear clases.'
                },
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

                if (
                    pago.estado == 'aprobado'
                    and pago.monto_devuelto == 0
                ):
                    cliente = reserva.paciente

                   

                    # Registrar la devolución
                    cliente = reserva.paciente
                    cliente.saldo_a_favor += pago.monto_abonado
                    cliente.save()

                    devueltas += 1

            except PagoReserva.DoesNotExist:
                pass

            reserva.estado = 'CANCELADA'
            reserva.save()

        clase.activa = False
        clase.save()

        return Response(
            {
                'detail':
                f'Clase desactivada. '
                f'{devueltas} devoluciones procesadas.'
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], url_path='terminar')
    def terminar_clase(self, request, pk=None):
        clase = self.get_object()
        user = request.user
        es_admin = hasattr(user, 'administrador')
        es_kinesiologo_asignado = (
            hasattr(user, 'kinesiologo') and
            clase.kinesiologo == user.kinesiologo
        )

        if not es_admin and not es_kinesiologo_asignado:
            return Response(
                {'error': 'No tenes permisos para terminar esta clase.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if clase.finalizada:
            return Response(
                {'error': 'Esta clase ya fue finalizada.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not clase.fecha_clase:
            return Response(
                {'error': 'La clase no tiene fecha asignada.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        inicio = timezone.make_aware(datetime.combine(clase.fecha_clase, clase.hora_inicio))
        fin = inicio + timedelta(minutes=clase.duracion_minutos)
        ahora = timezone.now()

        if not (inicio <= ahora <= fin):
            return Response(
                {'error': 'Solo se puede terminar una clase mientras esta en curso.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        reservas_ausentes = Reserva.objects.filter(
            clase=clase,
            estado='CONFIRMADA',
            asistio=False,
        ).select_related('paciente__usuario')

        suspendidos = []
        for reserva in reservas_ausentes:
            cliente = reserva.paciente
            if not cliente.suspendido:
                cliente.suspendido = True
                cliente.fecha_suspension = ahora.date()
                cliente.save()

            suspendidos.append({
                'cliente_id': cliente.id,
                'nombre': cliente.usuario.nombre,
                'apellido': cliente.usuario.apellido,
                'email': cliente.usuario.email,
            })

        clase.finalizada = True
        clase.fecha_finalizacion = ahora
        clase.save()

        return Response(
            {
                'mensaje': 'Clase finalizada correctamente.',
                'suspendidos': suspendidos,
                'cantidad_suspendidos': len(suspendidos),
            },
            status=status.HTTP_200_OK
        )

    # HU#28 - Visualizar grilla de turnos
    @action(detail=False, methods=['get'], url_path='grilla')
    def grilla(self, request):
        """
        Devuelve las clases activas agrupadas por día
        para armar la grilla semanal.
        """

        dias = [
            'lunes',
            'martes',
            'miercoles',
            'jueves',
            'viernes'
        ]

        grilla = {}

        hoy = date.today()
        limite = hoy + timedelta(days=7)

        for dia in dias:

            clases_dia = Clase.objects.filter(
                dia=dia,
                activa=True,
                fecha_clase__gte=hoy,
                fecha_clase__lte=limite
            ).order_by('hora_inicio')

            grilla[dia] = ClaseSerializer(
                clases_dia,
                many=True
            ).data

        return Response(grilla)

    # HU#32 - Ver turnos del kinesiólogo autenticado
    @action(
        detail=False,
        methods=['get'],    
        url_path='mis-clases'
    )
    def mis_clases(self, request):
        """
        Endpoint exclusivo para el kinesiólogo:
        devuelve solo sus clases.
        """

        user = request.user

        if not hasattr(user, 'kinesiologo'):
            return Response(
                {
                    'detail':
                    'Solo disponible para kinesiólogos.'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        clases = Clase.objects.filter(
            kinesiologo=user.kinesiologo,
            activa=True
        ).order_by(
            'fecha_clase',
            'hora_inicio'
        )

        serializer = ClaseSerializer(
            clases,
            many=True
        )

        return Response(serializer.data)
    
# ─────────────────────────────────────────
# Generar QR de una clase
# ─────────────────────────────────────────
class GenerarQRClaseView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, clase_id):
        try:
            clase = Clase.objects.get(id=clase_id, activa=True)
        except Clase.DoesNotExist:
            return Response(
                {'error': 'Clase no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Solo el kinesiólogo asignado o un admin puede generar el QR
        user = request.user
        es_admin = hasattr(user, 'administrador')
        es_kinesiologo_asignado = (
            hasattr(user, 'kinesiologo') and
            clase.kinesiologo == user.kinesiologo
        )

        if not es_admin and not es_kinesiologo_asignado:
                    return Response(
                        {'error': 'No tiene permisos para generar el QR de esta clase'},
                        status=status.HTTP_403_FORBIDDEN
                    )

        # Verificar que la clase esté en curso
        fecha_hora_inicio = timezone.make_aware(
            datetime.combine(clase.fecha_clase, clase.hora_inicio)
        )
        fecha_hora_fin = fecha_hora_inicio + timedelta(hours=1)
        ahora = timezone.now()

        if ahora < fecha_hora_inicio:
            return Response(
                {'error': f'El QR se habilita a las {clase.hora_inicio.strftime("%H:%M")} hs cuando comience la clase.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if ahora > fecha_hora_fin:
            return Response(
                {'error': 'La clase ya terminó. No se puede generar el QR.'},
                status=status.HTTP_400_BAD_REQUEST
            )

                # URL que va a abrir el celular al escanear
        # En desarrollo usar la IP local o ngrok
        frontend_url = "https://choking-nursing-reveler.ngrok-free.dev"
        url_asistencia = f"http://172.20.10.13:5173/asistencia/qr/{clase.qr_token}/"

        # Generar imagen QR
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(url_asistencia)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        # Convertir a base64 para enviar al frontend
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

        return Response({
            'qr_image': f'data:image/png;base64,{img_base64}',
            'qr_token': str(clase.qr_token),
            'url_asistencia': url_asistencia,
            'clase': {
                'id': clase.id,
                'tipo': clase.get_tipo_display(),
                'fecha': str(clase.fecha_clase),
                'hora': str(clase.hora_inicio),
            }
        })


# ─────────────────────────────────────────
# Registrar asistencia por QR
# ─────────────────────────────────────────
class AsistenciaQRView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, qr_token):
        try:
            clase = Clase.objects.get(qr_token=qr_token, activa=True)
        except Clase.DoesNotExist:
            return Response(
                {'error': 'QR inválido o clase no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verificar que quien escanea es un cliente
        user = request.user
        if not hasattr(user, 'cliente'):
            return Response(
                {'error': 'Solo los clientes pueden registrar asistencia por QR'},
                status=status.HTTP_403_FORBIDDEN
            )

        cliente = user.cliente

        # Verificar que tiene reserva confirmada para esta clase
        try:
            reserva = Reserva.objects.get(
                clase=clase,
                paciente=cliente,
                estado='CONFIRMADA'
            )
        except Reserva.DoesNotExist:
            return Response(
                {'error': 'No tenés una reserva confirmada para esta clase'},
                status=status.HTTP_404_NOT_FOUND
            )

        if reserva.metodo_asistencia == 'MANUAL':
                    return Response(
                        {'error': 'El kinesiólogo ya pasó asistencia en esta clase'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

        if reserva.asistio:
            return Response(
                {'mensaje': 'Ya registraste tu asistencia para esta clase'},
                status=status.HTTP_200_OK
           )
        from apps.pagos.models import PagoReserva
        try:
            pago = PagoReserva.objects.get(reserva=reserva)
            if pago.tipo_pago == 'sena' and pago.saldo_pendiente > 0:
                return Response(
                    {'error': 'Tenés una seña pendiente de completar. Hablá con el administrador para pagar el resto antes de registrar tu asistencia.'},
                     status=status.HTTP_400_BAD_REQUEST
                )
        except PagoReserva.DoesNotExist:
            pass

        reserva.asistio = True
        reserva.metodo_asistencia = 'QR'
        reserva.fecha_asistencia = timezone.now()
        reserva.save()

        return Response({
            'mensaje': f'Asistencia registrada correctamente para {clase.get_tipo_display()}',
            'clase': clase.get_tipo_display(),
            'fecha': str(clase.fecha_clase),
            'hora': str(clase.hora_inicio),
        })


# ─────────────────────────────────────────
# Cargar asistencia manual (kinesiólogo)
# ─────────────────────────────────────────
class AsistenciaManualView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, clase_id):
        user = request.user
        es_admin = hasattr(user, 'administrador')
        es_kinesiologo = hasattr(user, 'kinesiologo')

        if not es_admin and not es_kinesiologo:
            return Response(
                {'error': 'No tiene permisos para cargar asistencia'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            clase = Clase.objects.get(id=clase_id, activa=True)
        except Clase.DoesNotExist:
            return Response(
                {'error': 'Clase no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        reserva_id = request.data.get('reserva_id')
        asistio    = request.data.get('asistio')

        if reserva_id is None or asistio is None:
            return Response(
                {'error': 'Se requieren reserva_id y asistio'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
                    reserva = Reserva.objects.get(id=reserva_id, clase=clase)
                    if reserva.metodo_asistencia == 'QR':
                        return Response(
                            {'error': 'La asistencia fue registrada por QR y no puede modificarse manualmente.'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
        except Reserva.DoesNotExist:
                    return Response(
                        {'error': 'Reserva no encontrada'},
                        status=status.HTTP_404_NOT_FOUND
                    )

                # Bloquear asistencia si pagó seña y no completó el pago
        if asistio:
            from apps.pagos.models import PagoReserva
            try:
                pago = PagoReserva.objects.get(reserva=reserva)
                if pago.tipo_pago == 'sena' and pago.saldo_pendiente > 0:
                    return Response(
                        {'error': 'El cliente tiene una seña pendiente de completar. No se puede marcar asistencia hasta que pague el resto.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except PagoReserva.DoesNotExist:
                pass
            
        reserva.asistio = asistio
        reserva.metodo_asistencia = 'MANUAL'
        reserva.fecha_asistencia = timezone.now()
        reserva.save()

        return Response({
            'mensaje': f'Asistencia {"registrada" if asistio else "removida"} correctamente',
            'reserva_id': reserva.id,
            'paciente': str(reserva.paciente),
            'asistio': reserva.asistio,
        })


# ─────────────────────────────────────────
# Ver turnos del kinesiólogo autenticado
# ─────────────────────────────────────────
class MisClasesKinesiologoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if not hasattr(user, 'kinesiologo'):
            return Response(
                {'error': 'Solo los kinesiólogos pueden ver sus clases'},
                status=status.HTTP_403_FORBIDDEN
            )

        clases = Clase.objects.filter(
            kinesiologo=user.kinesiologo,
            activa=True
        ).order_by('fecha_clase', 'hora_inicio')

        data = []
        for clase in clases:
            reservas = Reserva.objects.filter(
                clase=clase,
                estado='CONFIRMADA'
            ).select_related('paciente__usuario')

            pacientes = [{
                'reserva_id':  r.id,
                'nombre':      r.paciente.usuario.nombre,
                'apellido':    r.paciente.usuario.apellido,
                'asistio':     r.asistio,
            } for r in reservas]

            data.append({
                'id':             clase.id,
                'tipo':           clase.get_tipo_display(),
                'fecha':          str(clase.fecha_clase),
                'hora_inicio':    str(clase.hora_inicio),
                'sala':           clase.sala,
                'cupos_disponibles': clase.cupos_disponibles(),
                'pacientes':      pacientes,
            })

        return Response(data)
