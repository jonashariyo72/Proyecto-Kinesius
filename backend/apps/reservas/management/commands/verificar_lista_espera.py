from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from apps.reservas.models import ListaEspera
from apps.reservas.utils import notificar_siguiente

class Command(BaseCommand):

    def handle(self, *args, **kwargs):

        expirados = ListaEspera.objects.filter(
            notificado=True,
            fecha_notificacion__lt=
                timezone.now() - timedelta(hours=2)
        )

        for espera in expirados:

            clase = espera.clase

            espera.delete()

            notificar_siguiente(
                clase,
                excluir_id=None
            )