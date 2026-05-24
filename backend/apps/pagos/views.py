from decimal import Decimal
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import PagoReserva
from .serializers import ConfirmarPagoSerializer, PagoReservaSerializer
from apps.usuarios.permissions import EsAdministrador
from .mp_service import generar_preferencia_mp
 
from apps.reservas.models import Reserva
from decimal import Decimal
# ── Helper ────────────────────────────────────────────────────────────────────

def calcular_monto_abonado(tipo_pago, monto_total):
    if tipo_pago == 'sena':
        return (monto_total * Decimal('0.5')).quantize(Decimal('0.01'))
    return monto_total


# ── Mock temporal para testear sin reservas reales ────────────────────────────

class PagoMock:
    def __init__(self, user, tipo_pago, monto_total):
        self.pk = 999
        self.id = 999
        self.monto_abonado = calcular_monto_abonado(tipo_pago, monto_total)
        self.monto_total_clase = monto_total
        self.saldo_pendiente = monto_total - self.monto_abonado

        # Validamos si el usuario es anónimo para evitar el error del email
        if user.is_anonymous:
            # Creamos un usuario falso con un email de test
            usuario_falso = type('UserMock', (), {'email': 'test_manuel@example.com'})()
        else:
            usuario_falso = user

        # Asociamos el usuario al cliente mock
        self.cliente = type('ClienteMock', (), {'usuario': usuario_falso})()
        self.reserva = type('ReservaMock', (), {'id': 999})()

    def get_tipo_pago_display(self):
        return 'Seña (50%)' if self.monto_abonado < self.monto_total_clase else 'Total'

    def get_metodo_pago_display(self):
        return 'Mercado Pago'


# ── Views ─────────────────────────────────────────────────────────────────────

class IniciarPagoView(APIView):

    authentication_classes = [] #esto esta solo para testear
    permission_classes = [AllowAny]

    def post(self, request):

        tipo_pago   = request.data.get('tipo_pago',   'sena')
        metodo_pago = request.data.get('metodo_pago', 'mercadopago')
        reserva_id  = request.data.get('reserva_id')

        if reserva_id:
            # ── Flujo real ──────────────────────────────────────────
            try:
                reserva = Reserva.objects.select_related(
                    'paciente__usuario', 'clase'
                ).get(pk=reserva_id)
            except Reserva.DoesNotExist:
                return Response({'error': 'Reserva no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

            if reserva.estado != 'PENDIENTE':
                return Response({'error': f'La reserva ya tiene estado {reserva.estado}.'}, status=status.HTTP_400_BAD_REQUEST)

            monto_total  = reserva.clase.precio
            monto_abonado = calcular_monto_abonado(tipo_pago, monto_total)

            # Crear o reutilizar el PagoReserva
            pago_obj, created = PagoReserva.objects.get_or_create(
                reserva=reserva,
                defaults={
                    'cliente':           reserva.paciente,
                    'tipo_pago':         tipo_pago,
                    'metodo_pago':       metodo_pago,
                    'monto_total_clase': monto_total,
                    'monto_abonado':     monto_abonado,
                    'estado':            'pendiente',
                }
            )

            if not created and pago_obj.estado == 'aprobado':
                return Response({'error': 'Esta reserva ya tiene un pago aprobado.'}, status=status.HTTP_400_BAD_REQUEST)

            respuesta = {
                'pago_id':         pago_obj.pk,
                'tipo_pago':       pago_obj.get_tipo_pago_display(),
                'metodo_pago':     pago_obj.get_metodo_pago_display(),
                'monto_abonado':   str(pago_obj.monto_abonado),
                'monto_total':     str(pago_obj.monto_total_clase),
                'saldo_pendiente': str(pago_obj.saldo_pendiente),
                'mp_init_point':   None,
            }

        else:
            # ── Flujo mock (queda igual que antes) ──────────────────
            monto_raw = request.data.get('monto_total_clase')
            try:
                monto_total = Decimal(str(monto_raw)) if monto_raw else Decimal('1000')
            except Exception:
                monto_total = Decimal('1000')

            pago_obj = PagoMock(request.user, tipo_pago, monto_total)
            respuesta = {
                'pago_id':         pago_obj.pk,
                'tipo_pago':       pago_obj.get_tipo_pago_display(),
                'metodo_pago':     pago_obj.get_metodo_pago_display(),
                'monto_abonado':   str(pago_obj.monto_abonado),
                'monto_total':     str(pago_obj.monto_total_clase),
                'saldo_pendiente': str(pago_obj.saldo_pendiente),
                'mp_init_point':   None,
            }

        if metodo_pago == 'mercadopago':
            try:
                respuesta['mp_init_point'] = generar_preferencia_mp(pago_obj)
            except Exception as e:
                import traceback; traceback.print_exc()
                return Response(
                    {'error': f'Error al conectar con Mercado Pago: {str(e)}'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

        return Response(respuesta, status=status.HTTP_201_CREATED)


class ConfirmarPagoView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ConfirmarPagoSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        try:
            pago = PagoReserva.objects.select_related('reserva', 'cliente').get(pk=data['pago_id'])
        except PagoReserva.DoesNotExist:
            return Response({'error': 'Pago no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        cliente  = getattr(request.user, 'cliente', None)
        es_admin = hasattr(request.user, 'administrador')
        if request.user.is_authenticated:
            cliente  = getattr(request.user, 'cliente', None)
            es_admin = hasattr(request.user, 'administrador')
            if not es_admin and (not cliente or pago.cliente != cliente):
                return Response({'error': 'No tenés permiso para confirmar este pago.'}, status=status.HTTP_403_FORBIDDEN)

        if pago.estado != 'pendiente':
            return Response({'error': f'El pago ya fue procesado: {pago.get_estado_display()}.'}, status=status.HTTP_400_BAD_REQUEST)

        pago.estado = data['estado']
        if data.get('id_transaccion_externa'):
            pago.id_transaccion_externa = data['id_transaccion_externa']
        pago.save()

        if pago.estado == 'aprobado':
            pago.reserva.estado = 'CONFIRMADA'
            pago.reserva.save()

        return Response(
            {'mensaje': f'Pago {pago.get_estado_display()} correctamente.', 'pago': PagoReservaSerializer(pago).data},
            status=status.HTTP_200_OK
        )


class DetallePagoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pago_id):
        try:
            pago = PagoReserva.objects.get(pk=pago_id)
        except PagoReserva.DoesNotExist:
            return Response({'error': 'Pago no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        cliente  = getattr(request.user, 'cliente', None)
        es_admin = hasattr(request.user, 'administrador')
        if not es_admin and (not cliente or pago.cliente != cliente):
            return Response({'error': 'No tenés permiso para ver este pago.'}, status=status.HTTP_403_FORBIDDEN)

        return Response(PagoReservaSerializer(pago).data)


class MisPagosView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cliente = getattr(request.user, 'cliente', None)
        if not cliente:
            return Response({'error': 'Solo los clientes pueden ver su historial.'}, status=status.HTTP_403_FORBIDDEN)

        pagos = PagoReserva.objects.filter(cliente=cliente).select_related('reserva')
        return Response(PagoReservaSerializer(pagos, many=True).data)


class PagosAdminView(APIView):
    permission_classes = [EsAdministrador]

    def get(self, request):
        pagos  = PagoReserva.objects.select_related('reserva', 'cliente__usuario').all()
        estado = request.query_params.get('estado')
        if estado in ['pendiente', 'aprobado', 'rechazado']:
            pagos = pagos.filter(estado=estado)
        return Response(PagoReservaSerializer(pagos, many=True).data)
    
    
class SaldoFavorView(APIView):
    """
    GET /api/pagos/saldo-favor/
    Devuelve el saldo a favor disponible del cliente autenticado,
    sumando el saldo_a_favor de todas sus reservas canceladas.
    """
    permission_classes = [IsAuthenticated]
 
    def get(self, request):
        from apps.reservas.models import Reserva
        from decimal import Decimal
 
        cliente = getattr(request.user, 'cliente', None)
        if not cliente:
            return Response({'error': 'Solo los clientes pueden consultar su saldo.'}, status=status.HTTP_403_FORBIDDEN)
 
        reservas_canceladas = Reserva.objects.filter(
            paciente=cliente,
            estado='CANCELADA',
            saldo_a_favor__gt=0
        )
        total_saldo = sum(r.saldo_a_favor for r in reservas_canceladas) or Decimal('0')
 
        return Response({'saldo_disponible': str(total_saldo)})