from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from datetime import timedelta, date
from .models import Reserva, ListaEspera
from .serializers import ReservaSerializer, ListaEsperaSerializer
from .permissions import IsOwnerOrAdmin
from decimal import Decimal
from datetime import datetime, timedelta
from django.core.mail import send_mail
from django.core.mail import EmailMultiAlternatives
from apps.pagos.pricing import (
    calcular_monto_total_reserva,
    cliente_tiene_abono_vigente,
    contar_cancelaciones_tardias_en_periodo,
)
from apps.pagos.pricing import calcular_monto_total_reserva
from apps.pagos.models import PagoReserva
from datetime import datetime

class ReservaViewSet(viewsets.ModelViewSet):
    queryset = Reserva.objects.all()
    serializer_class = ReservaSerializer
    permission_classes = [IsOwnerOrAdmin]
    
    def create(self, request, *args, **kwargs):
        """
        Validación:
        Solo se pueden reservar clases dentro de los próximos 7 días.
        """

        clase_id = request.data.get('clase')

        if not clase_id:
            return Response(
                {"error": "Debe enviar una clase."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from apps.clases.models import Clase
            clase = Clase.objects.get(id=clase_id)

        except Clase.DoesNotExist:
            return Response(
                {"error": "La clase no existe."},
                status=status.HTTP_404_NOT_FOUND
            )

        # VALIDACIÓN DE 7 DÍAS
        if clase.fecha_clase > date.today() + timedelta(days=7):
            return Response(
                {
                    "error": "Solo se pueden reservar clases dentro de los próximos 7 días."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        response = super().create(request, *args, **kwargs)

        if response.status_code == status.HTTP_201_CREATED:
            reserva = Reserva.objects.select_related('paciente', 'clase').get(pk=response.data['id'])
            monto_total = calcular_monto_total_reserva(reserva)
            response.data['monto_total'] = str(monto_total)

            if monto_total == Decimal('0.00'):
                reserva.estado = 'CONFIRMADA'
                reserva.cubierta_por_abono = True
                reserva.save()
                response.data['estado'] = reserva.estado
                response.data['cubierta_por_abono'] = True
            else:
                response.data['cubierta_por_abono'] = False

        return response

    @action(detail=False, methods=['get'], url_path='mis-turnos/(?P<dni>[^/.]+)')
    def visualizar_grilla(self, request, dni=None):
        """
        HU: VISUALIZAR GRILLA DE TURNOS
        Escenario 1 y 2: Filtra por ID del cliente.
        """

        reservas = Reserva.objects.filter(
            paciente__id=dni,
            estado='CONFIRMADA'
        )

        if not reservas.exists():
            return Response(
                {"detail": "No hay clases disponibles."},
                status=status.HTTP_200_OK
            )

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

    @action(detail=True, methods=['post'])
    def cancelar_reserva(self, request, pk=None):
        
        
        try:
            reserva = Reserva.objects.get(id=pk)
        except Reserva.DoesNotExist:
            return Response(
                {"error": "Reserva no encontrada"},
                status=status.HTTP_404_NOT_FOUND
            )

        if reserva.estado == 'CANCELADA':
            return Response(
                {"error": "La reserva ya está cancelada"},
                status=status.HTTP_400_BAD_REQUEST
            )

        from apps.pagos.models import PagoReserva
        from decimal import Decimal

        saldo = Decimal('0')
        ahora = timezone.now()
        fecha_hora_clase = datetime.combine(
            reserva.clase.fecha_clase,
            reserva.clase.hora_inicio
        )
        fecha_hora_clase = timezone.make_aware(fecha_hora_clase)
        diferencia = fecha_hora_clase - ahora
        es_abonado = cliente_tiene_abono_vigente(reserva.paciente, reserva.clase.fecha_clase)
        cancelacion_tardia = es_abonado and diferencia < timedelta(hours=48)
        penalizaciones_mes = 0
        tipo_devolucion = 'ninguna'

        if es_abonado:
            try:
                pago = reserva.pago
            except PagoReserva.DoesNotExist:
                pago = None

            if pago and pago.estado == 'aprobado':
                saldo = pago.monto_abonado
                tipo_devolucion = 'saldo'
                pago.monto_devuelto = saldo
                pago.save()

                reserva.paciente.saldo_a_favor += saldo
                reserva.paciente.save()
            else:
                reserva.cubierta_por_abono = True
                tipo_devolucion = 'cupo'

            reserva.estado = 'CANCELADA'
            reserva.cancelacion_tardia = cancelacion_tardia
            reserva.fecha_cancelacion = ahora
            reserva.save()

            if cancelacion_tardia:
                penalizaciones_mes = contar_cancelaciones_tardias_en_periodo(
                    reserva.paciente,
                    reserva.clase.fecha_clase
                )
                reserva.paciente.cant_cancelaciones = penalizaciones_mes
                reserva.paciente.save()

            return Response(
                {
                    "mensaje": "Reserva cancelada correctamente",
                    "saldo_a_favor": str(saldo),
                    "tipo_devolucion": tipo_devolucion,
                    "cupo_abono_liberado": tipo_devolucion == 'cupo',
                    "cancelacion_tardia": cancelacion_tardia,
                    "penalizaciones_mes": penalizaciones_mes,
                    "pierde_descuento_abonado": penalizaciones_mes >= 3,
                },
                status=status.HTTP_200_OK
            )

        try:
            pago = reserva.pago
            if pago.estado in ['aprobado']:
                ahora = timezone.now()

                # Combinar fecha_clase con hora_inicio para calcular diferencia
                fecha_hora_clase = datetime.combine(
                    reserva.clase.fecha_clase,
                    reserva.clase.hora_inicio
                )
                fecha_hora_clase = timezone.make_aware(fecha_hora_clase)
                diferencia = fecha_hora_clase - ahora

                # Más de 24 hs → devolucion total
                if es_abonado:
                    saldo = pago.monto_abonado
                elif diferencia > timedelta(hours=24):
                    saldo = pago.monto_abonado

                # Menos de 24 hs
                else:
                    # Pagó total → devuelve 50%
                    if pago.tipo_pago == 'total':
                        saldo = (pago.monto_abonado * Decimal('0.5')).quantize(Decimal('0.01'))
                    # Pagó seña → no devuelve
                    else:
                        saldo = Decimal('0')

                if saldo > 0:
                    pago.monto_devuelto = saldo
                    pago.save()

                    cliente = reserva.paciente
                    cliente.saldo_a_favor += saldo
                    cliente.save()
        except PagoReserva.DoesNotExist:
            if es_abonado:
                reserva.cubierta_por_abono = True

        reserva.estado = 'CANCELADA'
        reserva.cancelacion_tardia = cancelacion_tardia
        reserva.fecha_cancelacion = ahora
        reserva.save()

        if cancelacion_tardia:
            penalizaciones_mes = contar_cancelaciones_tardias_en_periodo(
                reserva.paciente,
                reserva.clase.fecha_clase
            )
            reserva.paciente.cant_cancelaciones = penalizaciones_mes
            reserva.paciente.save()

        # Notificar al primero en lista de espera
        primer_espera = ListaEspera.objects.filter(
            clase=reserva.clase
        ).order_by('fecha_inscripcion').first()

        if primer_espera:
            primer_espera.notificado = True
            primer_espera.fecha_notificacion = timezone.now()
            primer_espera.save()

            link_respuesta = (f"http://localhost:5173/lista-espera/responder/{primer_espera.id}")

            html_content = f"""
            <h2>🎉 Se liberó un cupo</h2>

            <p>
            Hay una vacante disponible para una sesión que estabas esperando.
            </p>

            <p>
            <a href="{link_respuesta}"
            style="
                background:#2E7D32;
                color:white;
                padding:12px 20px;
                text-decoration:none;
                border-radius:6px;
                display:inline-block;">
                Responder solicitud
            </a>
            </p>

            <p>
            ⏳ Tenés 2 horas para responder.
            </p>
            """
            email = EmailMultiAlternatives(
                subject='Se liberó un cupo',
                body=f'Ingresá al siguiente enlace: {link_respuesta}',
                from_email='info@kinescius.com.ar',
                to=[primer_espera.paciente.usuario.email]
            )

            email.attach_alternative(html_content, "text/html")
            email.send(fail_silently=True)

        return Response(
            {
                "mensaje": "Reserva cancelada correctamente",
                "saldo_a_favor": str(saldo),
                "cancelacion_tardia": cancelacion_tardia,
                "penalizaciones_mes": penalizaciones_mes,
                "pierde_descuento_abonado": penalizaciones_mes >= 3,
            },
            status=status.HTTP_200_OK
        )
    
    from datetime import datetime, timedelta

    @action(detail=True, methods=['get'])
    def resumen_cancelacion(self, request, pk=None):

        try:
            reserva = Reserva.objects.get(id=pk)
        except Reserva.DoesNotExist:
            return Response(
                {"error": "Reserva no encontrada"},
                status=status.HTTP_404_NOT_FOUND
            )

        mensaje = ""
        devolucion = Decimal('0')

        ahora = timezone.now()
        fecha_hora_clase = datetime.combine(
            reserva.clase.fecha_clase,
            reserva.clase.hora_inicio
        )
        fecha_hora_clase = timezone.make_aware(fecha_hora_clase)
        diferencia = fecha_hora_clase - ahora
        es_abonado = cliente_tiene_abono_vigente(reserva.paciente, reserva.clase.fecha_clase)

        if es_abonado:
            if diferencia >= timedelta(hours=48):
                try:
                    pago = reserva.pago
                    devolucion = pago.monto_abonado
                    mensaje = (
                        "Cancelas con mas de 48 hs de anticipacion. "
                        "Como esta clase fue pagada aparte del abono, se devuelve el importe como saldo a favor."
                    )
                except Exception:
                    mensaje = (
                        "Cancelas con mas de 48 hs de anticipacion. "
                        "Como esta clase usaba uno de tus 4 cupos incluidos, se te devuelve el cupo para usarlo en otra clase del mes."
                    )
            else:
                penalizaciones = contar_cancelaciones_tardias_en_periodo(
                    reserva.paciente,
                    reserva.clase.fecha_clase
                ) + 1
                try:
                    pago = reserva.pago
                    devolucion = pago.monto_abonado
                    detalle_devolucion = "Como esta clase fue pagada aparte del abono, se devuelve el importe como saldo a favor."
                except Exception:
                    detalle_devolucion = "Como esta clase usaba uno de tus 4 cupos incluidos, se te devuelve el cupo para usarlo en otra clase del mes."

                mensaje = (
                    "Cancelas con menos de 48 hs de anticipacion. "
                    f"Esta cancelacion suma una penalizacion ({penalizaciones}/3). "
                    f"{detalle_devolucion}"
                )
                if penalizaciones >= 3:
                    mensaje += " Al llegar a 3, perdes el descuento en las proximas clases extra de este mes."

            return Response({
                "mensaje": mensaje,
                "devolucion": str(devolucion)
            })

        try:
            pago = reserva.pago

            if diferencia >= timedelta(hours=24):

                devolucion = pago.monto_abonado

                if pago.metodo_pago == 'saldo':
                    mensaje = (
                        "✅ Cancelás con más de 24 hs de anticipación. "
                        "El importe utilizado se acreditará nuevamente a tu saldo a favor."
                    )
                else:
                    mensaje = (
                        "✅ Cancelás con más de 24 hs de anticipación. "
                        "Se te devolverá el monto abonado como saldo a favor."
                    )

            else:

                if pago.tipo_pago.lower() == 'total':

                    devolucion = (
                        pago.monto_abonado * Decimal('0.5')
                    ).quantize(Decimal('0.01'))

                    mensaje = (
                        "⚠️ Cancelás con menos de 24 hs. "
                        "Se acreditará el 50% de lo abonado como saldo a favor."
                    )

                else:

                    mensaje = (
                        "❌ Cancelás con menos de 24 hs habiendo abonado una seña. "
                        "No corresponde devolución."
                    )

        except Exception:
            mensaje = "La reserva no posee pagos asociados."

        return Response({
            "mensaje": mensaje,
            "devolucion": str(devolucion)
        })

    @action(detail=False, methods=['get'], url_path='inscriptos/(?P<clase_id>[^/.]+)')
    def inscriptos_por_clase(self, request, clase_id=None):
        """
        Devuelve los clientes inscriptos a una clase.
        GET /reservas/gestion/inscriptos/<clase_id>/
        """

        reservas = Reserva.objects.filter(
            clase_id=clase_id,
            estado='CONFIRMADA'
        ).select_related('paciente__usuario')

        ahora = timezone.now()

        data = []
        for r in reservas:
            sena_pendiente = False
            try:
                pago = PagoReserva.objects.get(reserva=r)
                if pago.tipo_pago == 'sena' and pago.saldo_pendiente > 0:
                    # Verificar si la clase ya terminó
                    fecha_hora_fin = datetime.combine(
                        r.clase.fecha_clase,
                        r.clase.hora_inicio
                    )
                    fecha_hora_fin = timezone.make_aware(fecha_hora_fin) + timedelta(hours=1)

                    if ahora >= fecha_hora_fin:
                        # Clase terminada y no pagó → suspender
                        cliente = r.paciente
                        if not cliente.suspendido:
                            cliente.suspendido = True
                            cliente.fecha_suspension = ahora
                            cliente.save()
                    else:
                        sena_pendiente = True
            except PagoReserva.DoesNotExist:
                pass

            data.append({
                'reserva_id': r.id,
                'nombre': r.paciente.usuario.nombre,
                'apellido': r.paciente.usuario.apellido,
                'email': r.paciente.usuario.email,
                'asistio': r.asistio,
                'metodo_asistencia': r.metodo_asistencia,
                'sena_pendiente': sena_pendiente,
            })

        return Response(data)


class ListaEsperaViewSet(viewsets.ModelViewSet):
    queryset = ListaEspera.objects.all()
    serializer_class = ListaEsperaSerializer

    @action(detail=False, methods=['post'], url_path='inscribirse')
    def inscribirse(self, request):
        """
        HU #42 - Inscribirse a lista de espera de una sesión
        Recibe: { paciente: <id>, clase: <id> }
        """

        paciente_id = request.data.get('paciente')
        clase_id = request.data.get('clase')

        if not paciente_id or not clase_id:
            return Response(
                {"error": "Se requieren los campos 'paciente' y 'clase'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar que no esté ya en la lista para esa clase
        if ListaEspera.objects.filter(
            paciente_id=paciente_id,
            clase_id=clase_id
        ).exists():

            return Response(
                {"error": "Ya estás en la lista de espera para esta clase."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar que no tenga reserva confirmada
        if Reserva.objects.filter(
            paciente_id=paciente_id,
            clase_id=clase_id,
            estado='CONFIRMADA'
        ).exists():

            return Response(
                {"error": "Ya tenés una reserva confirmada para esta clase."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar existencia de clase
        try:
            from apps.clases.models import Clase
            clase = Clase.objects.get(id=clase_id)

        except Clase.DoesNotExist:
            return Response(
                {"error": "La clase no existe."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verificar que no tenga cupo
        if clase.tiene_cupo():
            return Response(
                {
                    "error": "La clase todavía tiene cupos disponibles. Podés reservar directamente."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        entrada = ListaEspera.objects.create(
            paciente_id=paciente_id,
            clase_id=clase_id
        )

        serializer = ListaEsperaSerializer(entrada)

        return Response(
            {
                "mensaje": "Te inscribiste correctamente a la lista de espera.",
                "data": serializer.data
            },
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'])
    def confirmar_cupo(self, request, pk=None):
        """
        HU #17 - Confirmar turno desde lista de espera
        """
        espera = self.get_object()

        primero = ListaEspera.objects.filter(
            clase=espera.clase
        ).order_by('fecha_inscripcion').first()

        if primero.id != espera.id:
            return Response(
                {"error": "No sos el primero de la lista de espera."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # El cliente debe haber sido notificado primero
        if not espera.notificado or not espera.fecha_notificacion:
            return Response(
                {"error": "No fuiste notificado para un cupo todavía."},
                status=status.HTTP_400_BAD_REQUEST
            )

        ahora = timezone.now()
        limite = espera.fecha_notificacion + timedelta(hours=2)

        # Escenario 2: tiempo expirado
        if ahora > limite:

            # Notificar al siguiente en la lista
            siguiente = ListaEspera.objects.filter(
                clase=espera.clase
            ).exclude(id=espera.id).order_by('fecha_inscripcion').first()

            if siguiente:
                siguiente.notificado = True
                siguiente.fecha_notificacion = timezone.now()
                siguiente.save()

                link_respuesta = (f"http://localhost:5173/lista-espera/responder/{siguiente.id}")

                html_content = f"""
                <h2>🎉 Se liberó un cupo</h2>

                <p>
                Hay una vacante disponible para una sesión que estabas esperando.
                </p>

                <p>
                <a href="{link_respuesta}"
                style="
                    background:#2563eb;
                    color:white;
                    padding:12px 20px;
                    text-decoration:none;
                    border-radius:6px;
                    display:inline-block;">
                    Responder solicitud
                </a>
                </p>

                <p>
                ⏳ Tenés 2 horas para responder.
                </p>
                """
                email = EmailMultiAlternatives(
                    subject='Se liberó un cupo',
                    body=f'Ingresá al siguiente enlace: {link_respuesta}',
                    from_email='info@kinescius.com.ar',
                    to=[siguiente.paciente.usuario.email]
                )

                email.attach_alternative(html_content, "text/html")
                email.send()

            espera.delete()

            return Response(
                {"error": "Confirmación fallida. El turno ha expirado."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Escenario 3: ya no hay cupo
        if not espera.clase.tiene_cupo():
            return Response(
                {"error": "El cupo vacante ya fue ocupado."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if Reserva.objects.filter(
            paciente=espera.paciente,
            clase=espera.clase,
            estado='CONFIRMADA'
        ).exists():

            return Response(
                {"error": "Ya poseés una reserva para esta clase."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Escenario 1: confirmación exitosa
        Reserva.objects.create(
            paciente=espera.paciente,
            clase=espera.clase,
            estado='CONFIRMADA'
        )

        espera.delete()

        return Response(
            {"mensaje": "Reserva confirmada exitosamente."},
            status=status.HTTP_201_CREATED
        )
    

    @action(detail=True, methods=['post'])
    def rechazar_cupo(self, request, pk=None):
        """
        HU #17 - Cancelar desde lista de espera
        """
        espera = self.get_object()

        primero = ListaEspera.objects.filter(
            clase=espera.clase
        ).order_by('fecha_inscripcion').first()

        if primero.id != espera.id:
            return Response(
                {"error": "No sos el primero de la lista de espera."},
                status=status.HTTP_400_BAD_REQUEST
            )

        siguiente = ListaEspera.objects.filter(
            clase=espera.clase
        ).exclude(id=espera.id).order_by(
            'fecha_inscripcion'
        ).first()

        if siguiente:
            siguiente.notificado = True
            siguiente.fecha_notificacion = timezone.now()
            siguiente.save()

            link_respuesta = (f"http://localhost:5173/lista-espera/responder/{siguiente.id}")

            html_content = f"""
            <h2>🎉 Se liberó un cupo</h2>

            <p>
            Hay una vacante disponible para una sesión que estabas esperando.
            </p>

            <p>
            <a href="{link_respuesta}"
            style="
                background:#2563eb;
                color:white;
                padding:12px 20px;
                text-decoration:none;
                border-radius:6px;
                display:inline-block;">
                Responder solicitud
            </a>
            </p>

            <p>
            ⏳ Tenés 2 horas para responder.
            </p>
            """
            email = EmailMultiAlternatives(
                subject='Se liberó un cupo',
                body=f'Ingresá al siguiente enlace: {link_respuesta}',
                from_email='info@kinescius.com.ar',
                to=[siguiente.paciente.usuario.email]
            )

            email.attach_alternative(html_content, "text/html")
            email.send()

        espera.delete()

        return Response(
            {
                "mensaje": "Se confirmó la cancelación"
            },
            status=status.HTTP_200_OK
        )


    @action(detail=False, methods=['get'], url_path='por-clase/(?P<clase_id>[^/.]+)')
    def por_clase(self, request, clase_id=None):
        """
        HU #18 - Visualizar lista de espera (para el administrador)
        GET /reservas/espera/por-clase/<clase_id>/
        """

        lista = ListaEspera.objects.filter(
            clase_id=clase_id
        ).order_by('fecha_inscripcion')

        # Escenario 2: lista vacía
        if not lista.exists():
            return Response(
                {
                    "mensaje": "La lista de espera para el turno seleccionado se encuentra vacía."
                },
                status=status.HTTP_200_OK
            )

        # Escenario 1: hay clientes
        serializer = ListaEsperaSerializer(lista, many=True)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def generar_reserva(self, request, pk=None):
        """
        Genera una reserva pendiente para iniciar el flujo de pago
        desde una entrada de lista de espera.
        """

        espera = self.get_object()

        # Debe seguir siendo el primero
        primero = ListaEspera.objects.filter(
            clase=espera.clase
        ).order_by('fecha_inscripcion').first()

        if not primero or primero.id != espera.id:
            return Response(
                {"error": "Ya no sos el primero de la lista de espera."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Debe haber sido notificado
        if not espera.notificado or not espera.fecha_notificacion:
            return Response(
                {"error": "No fuiste notificado para un cupo."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Debe seguir dentro de las 2 horas
        limite = espera.fecha_notificacion + timedelta(hours=2)

        if timezone.now() > limite:
            return Response(
                {"error": "La disponibilidad del cupo expiró."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Debe existir cupo libre
        if not espera.clase.tiene_cupo():
            return Response(
                {"error": "El cupo ya fue ocupado."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Si ya existe una reserva pendiente o confirmada la reutilizamos
        reserva_existente = Reserva.objects.filter(
            paciente=espera.paciente,
            clase=espera.clase,
            estado__in=['PENDIENTE', 'CONFIRMADA']
        ).first()

        if reserva_existente:
            monto_total = calcular_monto_total_reserva(reserva_existente)
            cubierta_por_abono = monto_total == Decimal('0.00')
            if cubierta_por_abono and reserva_existente.estado != 'CONFIRMADA':
                reserva_existente.estado = 'CONFIRMADA'
                reserva_existente.cubierta_por_abono = True
                reserva_existente.save()

            return Response(
                {
                    "reserva_id": reserva_existente.id,
                    "monto_total": str(monto_total),
                    "cubierta_por_abono": cubierta_por_abono,
                },
                status=status.HTTP_200_OK
            )

        reserva = Reserva.objects.create(
            paciente=espera.paciente,
            clase=espera.clase,
            estado='PENDIENTE'
        )

        monto_total = calcular_monto_total_reserva(reserva)
        cubierta_por_abono = monto_total == Decimal('0.00')
        if cubierta_por_abono:
            reserva.estado = 'CONFIRMADA'
            reserva.cubierta_por_abono = True
            reserva.save()



# Historial de cancelaciones del cliente

from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

class HistorialCancelacionesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cliente = getattr(request.user, 'cliente', None)
        if not cliente:
            return Response({'error': 'No es cliente.'}, status=403)

        reservas_canceladas = Reserva.objects.filter(
            paciente=cliente,
            estado='CANCELADA',
            fecha_cancelacion__isnull=False,
        ).select_related('clase', 'clase__kinesiologo__usuario').order_by('-fecha_cancelacion')

        from django.utils.timezone import localtime

        data = []
        for r in reservas_canceladas:
            monto_devuelto = 0
            try:
                monto_devuelto = float(r.pago.monto_devuelto) if r.pago.monto_devuelto else 0
            except Exception:
                pass

            kine = None
            if r.clase.kinesiologo:
                u = r.clase.kinesiologo.usuario
                kine = f'{u.nombre} {u.apellido}'

            fecha_cancelacion_local = localtime(r.fecha_cancelacion) if r.fecha_cancelacion else None

            data.append({
                'id':                 r.id,
                'fecha_cancelacion':  fecha_cancelacion_local.strftime('%d/%m/%Y %H:%M') if fecha_cancelacion_local else None,
                'fecha_clase':        r.clase.fecha_clase.strftime('%d/%m/%Y') if r.clase.fecha_clase else None,
                'dia_clase':          r.clase.get_dia_display(),
                'hora_clase':         r.clase.hora_inicio.strftime('%H:%M'),
                'tipo_clase':         r.clase.get_tipo_display(),
                'kinesiologo':        kine,
                'sala':               r.clase.sala,
                'cancelacion_tardia': r.cancelacion_tardia,
                'monto_devuelto':     monto_devuelto,
            })

        return Response(data)