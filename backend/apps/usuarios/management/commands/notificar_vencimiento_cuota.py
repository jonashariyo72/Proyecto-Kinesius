from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.utils import timezone
from apps.usuarios.models import Cliente


class Command(BaseCommand):
    help = 'Notifica por mail a los clientes abonados cuya cuota lleva 10+ días vencida.'

    def handle(self, *args, **options):
        hoy = timezone.now().date()

        clientes_vencidos = Cliente.objects.filter(
            es_abonado=True,
            usuario__is_active=True,
            fecha_venc_cuota__isnull=False,
        ).select_related('usuario')

        notificados = 0

        for cliente in clientes_vencidos:
            dias_vencido = (hoy - cliente.fecha_venc_cuota).days

            # Vencida hace 10 días o más → se le avisa y se le da de baja el abono
            if dias_vencido >= 10:
                send_mail(
                    subject='Tu cuota de Kinescius está vencida',
                    message=(
                        f'Hola {cliente.usuario.nombre},\n\n'
                        f'Tu cuota venció el {cliente.fecha_venc_cuota.strftime("%d/%m/%Y")} '
                        f'y todavía no registramos el pago.\n\n'
                        f'Por favor, regularizá tu situación para seguir disfrutando '
                        f'de los beneficios de ser abonado.'
                    ),
                    from_email='info@kinescius.com.ar',
                    recipient_list=[cliente.usuario.email],
                    fail_silently=True,
                )

                # Pierde el estado de abonado al pasar los 10 días sin pagar
                cliente.es_abonado = False
                cliente.save()

                notificados += 1
                self.stdout.write(self.style.WARNING(
                    f'Notificado y dado de baja: {cliente.usuario.email} '
                    f'({dias_vencido} días vencido)'
                ))

        self.stdout.write(self.style.SUCCESS(
            f'Proceso terminado. {notificados} cliente(s) notificado(s).'
        ))