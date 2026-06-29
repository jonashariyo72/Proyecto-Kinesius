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
from apps.pagos.pricing import calcular_monto_total_reserva

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

        try:
            pago = reserva.pago
            if pago.estado in ['aprobado']:
                ahora = timezone.now()

                # Combinar fecha_clase con hora_inicio para calcular diferencia
                from datetime import datetime
                fecha_hora_clase = datetime.combine(
                    reserva.clase.fecha_clase,
                    reserva.clase.hora_inicio
                )
                fecha_hora_clase = timezone.make_aware(fecha_hora_clase)
                diferencia = fecha_hora_clase - ahora

                # Más de 24 hs → devolucion total
                if diferencia > timedelta(hours=24):
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
            pass

        reserva.estado = 'CANCELADA'
        reserva.save()

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
            email.send()

        return Response(
            {
                "mensaje": "Reserva cancelada correctamente",
                "saldo_a_favor": str(saldo)
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

        try:
            pago = reserva.pago

            ahora = timezone.now()

            fecha_hora_clase = datetime.combine(
                reserva.clase.fecha_clase,
                reserva.clase.hora_inicio
            )

            fecha_hora_clase = timezone.make_aware(fecha_hora_clase)

            diferencia = fecha_hora_clase - ahora

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

        data = [
            {
                'reserva_id': r.id,
                'nombre': r.paciente.usuario.nombre,
                'apellido': r.paciente.usuario.apellido,
                'email': r.paciente.usuario.email,
                'asistio': r.asistio,
            }
            for r in reservas
        ]

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
            reserva.save()

        return Response(
            {
                "reserva_id": reserva.id,
                "monto_total": str(monto_total),
                "cubierta_por_abono": cubierta_por_abono,
            },
            status=status.HTTP_201_CREATED
        )

