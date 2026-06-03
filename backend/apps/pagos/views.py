from decimal import Decimal
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import PagoReserva
from .serializers import ConfirmarPagoSerializer, PagoReservaSerializer
from apps.usuarios.permissions import EsAdministrador
from .mp_service import generar_preferencia_mp, obtener_pago_mp, buscar_pago_por_external_reference
from apps.reservas.models import Reserva


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

        if user.is_anonymous:
            usuario_falso = type('UserMock', (), {'email': 'test_manuel@example.com'})()
        else:
            usuario_falso = user

        self.cliente = type('ClienteMock', (), {'usuario': usuario_falso})()
        self.reserva = type('ReservaMock', (), {'id': 999})()

    def get_tipo_pago_display(self):
        return 'Seña (50%)' if self.monto_abonado < self.monto_total_clase else 'Total'

    def get_metodo_pago_display(self):
        return 'Mercado Pago'


# ── Views ─────────────────────────────────────────────────────────────────────

class IniciarPagoView(APIView):
    authentication_classes = []  # solo para testear
    permission_classes = [AllowAny]

    def post(self, request):
        tipo_pago   = request.data.get('tipo_pago',   'sena')
        metodo_pago = request.data.get('metodo_pago', 'mercadopago')
        reserva_id  = request.data.get('reserva_id')

        # ── Flujo con saldo a favor ───────────────────────────────────────────
        if metodo_pago == 'saldo':
            if not reserva_id:
                return Response(
                    {'error': 'Se requiere reserva_id para pagar con saldo a favor.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                reserva = Reserva.objects.select_related(
                    'paciente__usuario', 'clase'
                ).get(pk=reserva_id)
            except Reserva.DoesNotExist:
                return Response({'error': 'Reserva no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

            cliente = reserva.paciente

            # Sumar todo el saldo disponible del cliente
            reservas_con_saldo = Reserva.objects.filter(
                paciente=cliente,
                estado='CANCELADA',
                saldo_a_favor__gt=0
            )
            saldo_disponible = sum(r.saldo_a_favor for r in reservas_con_saldo) or Decimal('0')
            monto_total = reserva.clase.precio

            if saldo_disponible < monto_total:
                return Response(
                    {
                        'error': 'Saldo insuficiente para cubrir el total de la clase.',
                        'saldo_disponible': str(saldo_disponible),
                        'monto_requerido':  str(monto_total),
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Descontar el saldo de las reservas canceladas (de la más antigua a la más nueva)
            restante = monto_total
            for r in reservas_con_saldo.order_by('fecha_creacion'):
                if restante <= 0:
                    break
                if r.saldo_a_favor >= restante:
                    r.saldo_a_favor -= restante
                    restante = Decimal('0')
                else:
                    restante -= r.saldo_a_favor
                    r.saldo_a_favor = Decimal('0')
                r.save()

            # Crear el pago y confirmar la reserva directamente
            pago = PagoReserva.objects.create(
                reserva=reserva,
                cliente=cliente,
                tipo_pago='total',
                metodo_pago='saldo',
                monto_total_clase=monto_total,
                monto_abonado=monto_total,
                estado='aprobado',
            )
            reserva.estado = 'CONFIRMADA'
            reserva.save()

            return Response(
                {
                    'mensaje':       'Pago con saldo a favor aprobado. Reserva confirmada.',
                    'pago_id':       pago.pk,
                    'monto_abonado': str(pago.monto_abonado),
                    'pago':          PagoReservaSerializer(pago).data,
                },
                status=status.HTTP_201_CREATED
            )

        # ── Flujo real (MP / tarjeta) ─────────────────────────────────────────
        if reserva_id:
            try:
                reserva = Reserva.objects.select_related(
                    'paciente__usuario', 'clase'
                ).get(pk=reserva_id)
            except Reserva.DoesNotExist:
                return Response({'error': 'Reserva no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

            monto_total   = reserva.clase.precio
            monto_abonado = calcular_monto_abonado(tipo_pago, monto_total)

            # Reutilizar pago existente solo si sigue pendiente
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
                return Response(
                    {'error': 'Esta reserva ya tiene un pago aprobado.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            respuesta = {
                'pago_id':         pago_obj.pk,
                'tipo_pago':       pago_obj.get_tipo_pago_display(),
                'metodo_pago':     pago_obj.get_metodo_pago_display(),
                'monto_abonado':   str(pago_obj.monto_abonado),
                'monto_total':     str(pago_obj.monto_total_clase),
                'saldo_pendiente': str(pago_obj.saldo_pendiente),
                'mp_init_point':   None,
            }

        # ── Flujo mock ────────────────────────────────────────────────────────
        else:
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

        if request.user.is_authenticated:
            cliente  = getattr(request.user, 'cliente', None)
            es_admin = hasattr(request.user, 'administrador')
            if not es_admin and (not cliente or pago.cliente != cliente):
                return Response(
                    {'error': 'No tenés permiso para confirmar este pago.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        if pago.estado != 'pendiente':
            return Response(
                {'error': f'El pago ya fue procesado: {pago.get_estado_display()}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        estado_final = data['estado']

        if data.get('id_transaccion_externa'):
            pago_mp = obtener_pago_mp(data['id_transaccion_externa'])
            estado_final = 'aprobado' if pago_mp.get('status') == 'approved' else 'rechazado'

        pago.estado = estado_final
        if data.get('id_transaccion_externa'):
            pago.id_transaccion_externa = data['id_transaccion_externa']
        pago.save()

        if pago.estado == 'aprobado':
            # La reserva se confirma recién acá, cuando el pago se aprueba
            pago.reserva.estado = 'CONFIRMADA'
            pago.reserva.save()
        else:
            # Si el pago se rechaza, no queda ningún rastro
            reserva = pago.reserva
            pago.delete()
            reserva.delete()

        return Response(
            {
                'mensaje': f'Pago {pago.get_estado_display()} correctamente.',
                'pago':    PagoReservaSerializer(pago).data,
            },
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
            return Response(
                {'error': 'Solo los clientes pueden ver su historial.'},
                status=status.HTTP_403_FORBIDDEN
            )
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
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cliente = getattr(request.user, 'cliente', None)

        if not cliente:
            return Response(
                {'error': 'Solo los clientes pueden consultar su saldo.'},
                status=status.HTTP_403_FORBIDDEN
            )

        return Response({
            'saldo_disponible': str(cliente.saldo_a_favor)
        })

class ConfirmarPagoSaldoView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from django.db.models import Sum
        reserva_id = request.data.get('reserva_id')
        tipo_pago  = str(request.data.get('tipo_pago', 'sena')).lower()

        if tipo_pago not in ['sena', 'total']:
            return Response({'error': 'Tipo de pago inválido.'}, status=status.HTTP_400_BAD_REQUEST)
        if not reserva_id:
            return Response({'error': 'Falta reserva_id.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            reserva = Reserva.objects.select_related('paciente', 'clase').get(pk=reserva_id)
        except Reserva.DoesNotExist:
            return Response({'error': 'Reserva no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        cliente = getattr(request.user, 'cliente', None)
        if not cliente or reserva.paciente != cliente:
            return Response({'error': 'No tenés permiso para pagar esta reserva.'}, status=status.HTTP_403_FORBIDDEN)

        monto_total   = reserva.clase.precio
        monto_a_pagar = calcular_monto_abonado(tipo_pago, monto_total)

        saldo_disponible = cliente.saldo_a_favor

        if saldo_disponible < monto_a_pagar:
            return Response({'error': 'Saldo a favor insuficiente.'}, status=status.HTTP_400_BAD_REQUEST)

        cliente.saldo_a_favor -= monto_a_pagar
        cliente.save()

        pago = PagoReserva.objects.create(
            reserva=reserva,
            cliente=cliente,
            tipo_pago=tipo_pago,
            metodo_pago='saldo',
            monto_total_clase=monto_total,
            monto_abonado=monto_a_pagar,
            estado='aprobado',
        )

        reserva.estado = 'CONFIRMADA'
        reserva.save()

        return Response(
            {
                'mensaje': 'Pago con saldo confirmado correctamente.',
                'pago': PagoReservaSerializer(pago).data,
                'saldo_restante': str(saldo_disponible - monto_a_pagar),
            },
            status=status.HTTP_200_OK
        )


class VerificarPagoMPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        pago_id = request.data.get('pago_id')

        if not pago_id:
            return Response({'error': 'Falta pago_id.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pago = PagoReserva.objects.select_related('reserva').get(pk=pago_id)
        except PagoReserva.DoesNotExist:
            return Response({'error': 'Pago no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        pago_mp = buscar_pago_por_external_reference(pago_id)

        if not pago_mp:
            return Response({'estado': 'pendiente'}, status=status.HTTP_200_OK)

        if pago_mp.get('status') == 'approved':
            pago.estado = 'aprobado'
            pago.id_transaccion_externa = str(pago_mp.get('id'))
            pago.save()

            pago.reserva.estado = 'CONFIRMADA'
            pago.reserva.save()

            return Response({'estado': 'aprobado'}, status=status.HTTP_200_OK)

        # Pago rechazado: limpiar todo
        reserva = pago.reserva
        pago.delete()
        reserva.delete()

        return Response({'estado': 'rechazado'}, status=status.HTTP_200_OK)