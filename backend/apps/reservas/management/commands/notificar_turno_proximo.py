from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.utils import timezone
from datetime import timedelta
from apps.reservas.models import Reserva


class Command(BaseCommand):
    help = 'Notifica por mail a los clientes que tienen un turno confirmado para mañana.'

    def handle(self, *args, **options):
        mañana = timezone.now().date() + timedelta(days=1)

        reservas_mañana = Reserva.objects.filter(
            estado='CONFIRMADA',
            clase__fecha_clase=mañana,
        ).select_related('paciente__usuario', 'clase')

        notificados = 0

        for reserva in reservas_mañana:
            cliente = reserva.paciente
            clase   = reserva.clase

            send_mail(
                subject='Recordatorio: tenés un turno mañana en Kinescius',
                message=(
                    f'Hola {cliente.usuario.nombre},\n\n'
                    f'Te recordamos que mañana {clase.fecha_clase.strftime("%d/%m/%Y")} '
                    f'a las {clase.hora_inicio.strftime("%H:%M")} hs tenés un turno de '
                    f'{clase.get_tipo_display()}'
                    + (f' en la sala {clase.sala}' if clase.sala else '')
                    + '.\n\n¡Te esperamos!'
                ),
                from_email='info@kinescius.com.ar',
                recipient_list=[cliente.usuario.email],
                fail_silently=True,
            )

            notificados += 1
            self.stdout.write(self.style.SUCCESS(
                f'Recordatorio enviado a {cliente.usuario.email} '
                f'(turno {clase.fecha_clase} {clase.hora_inicio})'
            ))

        self.stdout.write(self.style.SUCCESS(
            f'Proceso terminado. {notificados} recordatorio(s) enviado(s).'
        ))