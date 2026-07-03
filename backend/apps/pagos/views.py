from decimal import Decimal
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from dateutil.relativedelta import relativedelta
from calendar import monthrange
from .models import PagoCuota
from .models import ConfiguracionCuota
from .serializers import PagoCuotaSerializer
from datetime import date
from .models import PagoReserva
from .serializers import ConfirmarPagoSerializer, PagoReservaSerializer
from apps.usuarios.permissions import EsAdministrador
from .mp_service import generar_preferencia_mp, obtener_pago_mp, buscar_pago_por_external_reference
from apps.reservas.models import Reserva
from .pricing import calcular_monto_cuota, calcular_monto_total_reserva
from apps.pagos.services import aprobar_pago_cuota

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
            monto_total = calcular_monto_total_reserva(reserva)

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

            monto_total   = calcular_monto_total_reserva(reserva)
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

            if not created:
                pago_obj.tipo_pago = tipo_pago
                pago_obj.metodo_pago = metodo_pago
                pago_obj.monto_total_clase = monto_total
                pago_obj.monto_abonado = monto_abonado
                pago_obj.save()

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

        if (
            pago.metodo_pago == 'mercadopago'
            and data.get('id_transaccion_externa')
             ):
            pago_mp = obtener_pago_mp(data['id_transaccion_externa'])
            estado_final = (
                'aprobado'
                if pago_mp.get('status') == 'approved'
                else 'rechazado'
            )

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

        monto_total   = calcular_monto_total_reserva(reserva)
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

        pago_mp = buscar_pago_por_external_reference(str(pago.id), pago.monto_abonado)

        if not pago_mp:
            reserva = pago.reserva
            pago.delete()
            reserva.delete()

            return Response(
                {
                    'estado': 'no_realizado',
                    'mensaje': 'El pago no fue realizado'
                },
                status=status.HTTP_200_OK
            )

        pago.estado = 'aprobado'
        pago.id_transaccion_externa = str(pago_mp.get('id'))
        pago.save()

        pago.reserva.estado = 'CONFIRMADA'
        pago.reserva.save()

        return Response({
            'estado': 'aprobado',
            'pago': PagoReservaSerializer(pago).data,
        }, status=status.HTTP_200_OK)

        # Pago rechazado: limpiar todo
        reserva = pago.reserva
        pago.delete()
        reserva.delete()

        return Response({'estado': 'rechazado'}, status=status.HTTP_200_OK)
    
def primer_dia_mes_actual():
    hoy = date.today()
    return date(hoy.year, hoy.month, 1)


def periodo_cuota_para_fecha(hoy=None):
    hoy = hoy or date.today()
    config = ConfiguracionCuota.actual()
    ultimo_dia_mes = monthrange(hoy.year, hoy.month)[1]
    dia_fin = min(config.dia_fin_pago, ultimo_dia_mes)

    if not (1 <= config.dia_fin_pago <= ultimo_dia_mes):
        return None

    if 1 <= hoy.day <= dia_fin:
        return date(hoy.year, hoy.month, 1)

    return None
 
 


class IniciarPagoCuotaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        cliente = getattr(request.user, 'cliente', None)
        if not cliente:
            return Response({'error': 'Solo los clientes pueden pagar la cuota.'}, status=status.HTTP_403_FORBIDDEN)

        config = ConfiguracionCuota.actual()
        periodo = periodo_cuota_para_fecha()
        if not periodo:
            return Response(
                {
                    'error': (
                        f'Solo se puede pagar la cuota entre los dias '
                        f'1 y {config.dia_fin_pago}.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        ya_pago = PagoCuota.objects.filter(
            cliente=cliente, periodo=periodo, estado='aprobado'
        ).exists()
        if ya_pago:
            return Response({'error': 'Ya abonaste la cuota de este mes.'}, status=status.HTTP_400_BAD_REQUEST)

        metodo_pago = request.data.get('metodo_pago', 'mercadopago')
        MONTO_CUOTA = calcular_monto_cuota()

        pago_cuota, created = PagoCuota.objects.get_or_create(
            cliente=cliente,
            periodo=periodo,
            estado='pendiente',
            defaults={
                'monto': MONTO_CUOTA,
                'metodo_pago': metodo_pago,
            }
        )
        if not created:
            pago_cuota.metodo_pago = metodo_pago
            pago_cuota.save()

        mp_init_point = None
        if metodo_pago in ['mercadopago', 'tarjeta']:
            # mp_service.generar_preferencia_mp espera pago_obj.reserva.clase.tipo
            # para armar el título del item, así que simulamos esa cadena de objetos.
            clase_fake = type('ClaseFake', (), {'tipo': 'Cuota Mensual'})()
            reserva_fake = type('ReservaFake', (), {'clase': clase_fake})()

            clase_wrapper = type('CuotaWrapper', (), {
                'id': pago_cuota.pk,
                'monto_abonado': pago_cuota.monto,
                'cliente': cliente,
                'reserva': reserva_fake,
            })()

            try:
                mp_init_point = generar_preferencia_mp(clase_wrapper)
            except Exception as e:
                return Response(
                    {'error': f'Ocurrió un error al momento de realizar el pago: {str(e)}'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

        return Response(
            {
                'pago_cuota_id': pago_cuota.pk,
                'monto':         str(pago_cuota.monto),
                'periodo':       str(pago_cuota.periodo),
                'mp_init_point': mp_init_point,
            },
            status=status.HTTP_201_CREATED
        )
        
 
 
class ConfirmarPagoCuotaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        pago_cuota_id = request.data.get("pago_cuota_id")

        if not pago_cuota_id:
            return Response(
                {"error": "Falta pago_cuota_id."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            pago_cuota = PagoCuota.objects.select_related("cliente").get(
                pk=pago_cuota_id
            )
        except PagoCuota.DoesNotExist:
            return Response(
                {"error": "Pago de cuota no encontrado."},
                status=status.HTTP_404_NOT_FOUND
            )

        cliente = getattr(request.user, "cliente", None)

        if not cliente or pago_cuota.cliente != cliente:
            return Response(
                {"error": "No tenés permiso."},
                status=status.HTTP_403_FORBIDDEN
            )

        if pago_cuota.estado != "pendiente":
            return Response(
                {
                    "error":
                    f"Este pago ya fue procesado: {pago_cuota.get_estado_display()}."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        aprobar_pago_cuota(pago_cuota)

        return Response(
            {
                "mensaje": "Cuota aprobada correctamente.",
                "pago": PagoCuotaSerializer(pago_cuota).data,
            },
            status=status.HTTP_200_OK,
        )
    
class VerificarPagoCuotaMPView(APIView):
    """
    POST /api/pagos/cuota/verificar-mp/
    Verifica si la cuota fue abonada en Mercado Pago.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        pago_cuota_id = request.data.get("pago_cuota_id")

        if not pago_cuota_id:
            return Response(
                {"error": "Falta pago_cuota_id."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            pago_cuota = PagoCuota.objects.select_related("cliente").get(
                pk=pago_cuota_id
            )
        except PagoCuota.DoesNotExist:
            return Response(
                {"error": "Pago no encontrado."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verificar que el pago pertenezca al usuario
        cliente = getattr(request.user, "cliente", None)
        if not cliente or pago_cuota.cliente != cliente:
            return Response(
                {"error": "No tenés permiso para verificar este pago."},
                status=status.HTTP_403_FORBIDDEN
            )

        pago_mp = buscar_pago_por_external_reference(
            str(pago_cuota.id),
            pago_cuota.monto
        )

        # Nunca pagó o cerró Mercado Pago
        if not pago_mp:
            pago_cuota.delete()

            return Response(
                {
                    "estado": "no_realizado"
                },
                status=status.HTTP_200_OK
            )

        # Pago aprobado
        if pago_mp.get("status") == "approved":

            aprobar_pago_cuota(
                pago_cuota,
                pago_mp["id"]
            )
            

            return Response(
                {
                    "estado": "aprobado",
                    "pago": PagoCuotaSerializer(pago_cuota).data,
                },
                status=status.HTTP_200_OK
            )

        # Pago rechazado
        pago_cuota.delete()

        return Response(
            {
                "estado": "rechazado"
            },
            status=status.HTTP_200_OK
        )
    

class PagarCuotaEfectivoView(APIView):
    """
    POST /api/pagos/cuota/efectivo/
    Solo Administrador. Registra el pago de cuota en efectivo de forma manual.
    Body: { "cliente_id": <id> }
    """
    permission_classes = [EsAdministrador]
 
    def post(self, request):
        cliente_id = request.data.get('cliente_id')
 
        if not cliente_id:
            return Response({'error': 'Falta cliente_id.'}, status=status.HTTP_400_BAD_REQUEST)
 
        from apps.usuarios.models import Cliente
        try:
            cliente = Cliente.objects.get(pk=cliente_id)
        except Cliente.DoesNotExist:
            return Response({'error': 'Cliente no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
 
        config = ConfiguracionCuota.actual()
        periodo = periodo_cuota_para_fecha()
        if not periodo:
            return Response(
                {
                    'error': (
                        f'Solo se puede pagar la cuota entre los dias '
                        f'1 y {config.dia_fin_pago}.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )
 
        ya_pago = PagoCuota.objects.filter(
            cliente=cliente, periodo=periodo, estado='aprobado'
        ).exists()
        if ya_pago:
            return Response({'error': 'Este cliente ya abonó la cuota de este mes.'}, status=status.HTTP_400_BAD_REQUEST)
 
        MONTO_CUOTA = calcular_monto_cuota()
 
        admin = getattr(request.user, 'administrador', None)
 
        pago_cuota = PagoCuota.objects.create(
            cliente=cliente,
            periodo=periodo,
            monto=MONTO_CUOTA,
            metodo_pago='efectivo',
            estado='aprobado',
            registrado_por=admin,
        )
 
        cliente.es_abonado = True
        cliente.fecha_venc_cuota = periodo + relativedelta(months=1)
        cliente.save()
 
        return Response(
            {
                'mensaje': f'Cuota de {cliente.usuario.nombre} {cliente.usuario.apellido} registrada como pagada en efectivo.',
                'pago': PagoCuotaSerializer(pago_cuota).data,
            },
            status=status.HTTP_201_CREATED
        )    


class ConfiguracionCuotaView(APIView):
    permission_classes = [EsAdministrador]

    def get(self, request):
        config = ConfiguracionCuota.actual()
        return Response({
            'dia_inicio_pago': 1,
            'dia_fin_pago': config.dia_fin_pago,
        })

    def put(self, request):
        config = ConfiguracionCuota.actual()

        try:
            dia_fin = int(request.data.get('dia_fin_pago'))
        except (TypeError, ValueError):
            return Response({'error': 'El dia limite debe ser un numero.'}, status=status.HTTP_400_BAD_REQUEST)

        hoy = date.today()
        ultimo_dia_mes = monthrange(hoy.year, hoy.month)[1]

        if not (1 <= dia_fin <= ultimo_dia_mes):
            return Response(
                {'error': f'El dia limite debe estar entre 1 y {ultimo_dia_mes} para este mes.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        config.dia_inicio_pago = 1
        config.dia_fin_pago = dia_fin
        config.save()

        return Response({
            'mensaje': 'Configuracion de cuota actualizada correctamente.',
            'dia_inicio_pago': 1,
            'dia_fin_pago': config.dia_fin_pago,
        })
# ──────────────────────────────────────────────────────────────────────────
# AGREGAR a backend/apps/pagos/views.py
# Requiere import ya existente de: PagoReserva, Reserva, Response, status, etc.
# ──────────────────────────────────────────────────────────────────────────

class ListaSaldosPendientesView(APIView):
    """
    GET /api/pagos/saldos-pendientes/<dni>/
    Devuelve las reservas de un cliente que tienen saldo pendiente
    (pagaron seña pero no el total), ordenadas por fecha de clase
    (la más próxima primero). Solo Administrador.
    """
    permission_classes = [EsAdministrador]

    def get(self, request, dni):
        from apps.usuarios.models import Cliente

        try:
            cliente = Cliente.objects.select_related('usuario').get(usuario__dni=dni)
        except Cliente.DoesNotExist:
            return Response({'error': 'Cliente no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        from django.utils import timezone

        pagos_con_saldo = PagoReserva.objects.filter(
            cliente=cliente,
            estado='aprobado',
            tipo_pago='sena',
            reserva__clase__fecha_clase__gte=timezone.now().date(),  # solo clases futuras o de hoy
            reserva__clase__activa=True, 
        ).select_related('reserva__clase').order_by('reserva__clase__fecha_clase', 'reserva__clase__hora_inicio')

        data = []
        for pago in pagos_con_saldo:
            if pago.saldo_pendiente <= 0:
                continue
            clase = pago.reserva.clase
            data.append({
                'pago_id':         pago.pk,
                'reserva_id':      pago.reserva_id,
                'clase_tipo':      clase.tipo,
                'clase_fecha':     str(clase.fecha_clase),
                'clase_hora':      str(clase.hora_inicio),
                'saldo_pendiente': str(pago.saldo_pendiente),
            })

        if not data:
            return Response({'mensaje': 'Este cliente no tiene saldos pendientes.'}, status=status.HTTP_200_OK)

        return Response(data, status=status.HTTP_200_OK)


class PagarRestoEfectivoView(APIView):
    """
    POST /api/pagos/registrar-efectivo/
    HU: Registrar Pago en efectivo (Administrador)

    Body: { "pago_id": <id de PagoReserva> }

    Regla: solo se puede saldar la clase con fecha más próxima entre
    todas las que el cliente tiene pendientes. Si elige otra, se rechaza.
    """
    permission_classes = [EsAdministrador]

    def post(self, request):
        pago_id = request.data.get('pago_id')

        if not pago_id:
            return Response({'error': 'Falta pago_id.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pago = PagoReserva.objects.select_related('reserva__clase', 'cliente__usuario').get(pk=pago_id)
        except PagoReserva.DoesNotExist:
            return Response({'error': 'Pago no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if pago.saldo_pendiente <= 0:
            return Response({'error': 'Esta clase no tiene saldo pendiente.'}, status=status.HTTP_400_BAD_REQUEST)

        # ── Escenario 3: debe ser la clase con fecha más próxima ─────────
        siguiente_mas_proxima = PagoReserva.objects.filter(
            cliente=pago.cliente,
            estado='aprobado',
            tipo_pago='sena',
        ).select_related('reserva__clase').order_by(
            'reserva__clase__fecha_clase', 'reserva__clase__hora_inicio'
        ).first()

        # Filtramos en Python las que realmente tienen saldo pendiente
        pendientes = [
            p for p in PagoReserva.objects.filter(
                cliente=pago.cliente, estado='aprobado', tipo_pago='sena'
            ).select_related('reserva__clase').order_by(
                'reserva__clase__fecha_clase', 'reserva__clase__hora_inicio'
            )
            if p.saldo_pendiente > 0
        ]

        if pendientes and pendientes[0].pk != pago.pk:
            clase_proxima = pendientes[0].reserva.clase
            return Response(
                {
                    'error': (
                        f'Hay una clase con fecha más próxima a pagar '
                        f'({clase_proxima.fecha_clase.strftime("%d/%m/%Y")} '
                        f'{clase_proxima.hora_inicio.strftime("%H:%M")} hs). '
                        f'Esa debe saldarse primero.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # ── Escenario 1: pago exitoso ─────────────────────────────────────
        pago.monto_abonado = pago.monto_total_clase
        pago.save()

        return Response(
            {
                'mensaje': f'Se registró el pago en efectivo del resto de la clase de {pago.cliente.usuario.nombre} {pago.cliente.usuario.apellido}.',
                'pago': PagoReservaSerializer(pago).data,
            },
            status=status.HTTP_200_OK
        )    
