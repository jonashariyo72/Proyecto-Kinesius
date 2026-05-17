from django.db import models
from apps.usuarios.models import Cliente
from django.utils import timezone


class Reserva(models.Model):

    ESTADOS = (
        ('CONFIRMADA', 'Confirmada'),
        ('PENDIENTE', 'Pendiente de Pago'),
        ('CANCELADA', 'Cancelada'),
    )

    paciente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE
    )

    clase = models.ForeignKey(
        'clases.Clase',
        on_delete=models.CASCADE,
        related_name='reservas'
    )

    fecha_creacion = models.DateTimeField(auto_now_add=True)

    estado = models.CharField(
        max_length=20,
        choices=ESTADOS,
        default='PENDIENTE'
    )

    asistio = models.BooleanField(default=False)

    fecha_reserva = models.DateTimeField(default=timezone.now)

    PAGO_CHOICES = (
        ('TOTAL', 'Pago Total'),
        ('SENIA', 'Seña'),
    )

    tipo_pago = models.CharField(
        max_length=10,
        choices=PAGO_CHOICES,
        default='TOTAL'
    )

    saldo_a_favor = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )


class ListaEspera(models.Model):

    paciente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE
    )

    clase = models.ForeignKey(
        'clases.Clase',
        on_delete=models.CASCADE,
        related_name='lista_espera'
    )

    fecha_inscripcion = models.DateTimeField(auto_now_add=True)

    notificado = models.BooleanField(default=False)

    fecha_notificacion = models.DateTimeField(
        null=True,
        blank=True
    )