from django.db import models
from apps.usuarios.models import Cliente
from apps.clases.models import Clase
from django.utils import timezone

class Reserva(models.Model):

    ESTADOS = (
        ('CONFIRMADA', 'Confirmada'),
        ('PENDIENTE', 'Pendiente de Pago'),
        ('CANCELADA', 'Cancelada'),
    )

    paciente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name='reservas'
    )

    clase = models.ForeignKey(
        Clase,
        on_delete=models.CASCADE,
        related_name='reservas'
    )

    fecha_creacion = models.DateTimeField(auto_now_add=True)

    estado = models.CharField(
        max_length=20,
        choices=ESTADOS,
        default='PENDIENTE'
    )
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

    asistio = models.BooleanField(default=False)
    cubierta_por_abono = models.BooleanField(default=False)
    cancelacion_tardia = models.BooleanField(default=False)
    fecha_cancelacion = models.DateTimeField(blank=True, null=True)

    METODO_ASISTENCIA = (
        ('QR', 'QR'),
        ('MANUAL', 'Manual'),
    )

    metodo_asistencia = models.CharField(
        max_length=10,
        choices=METODO_ASISTENCIA,
        null=True,
        blank=True
    )

    fecha_asistencia = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f'{self.paciente} - {self.clase}'


class ListaEspera(models.Model):

    paciente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE
    )

    clase = models.ForeignKey(
        Clase,
        on_delete=models.CASCADE,
        related_name='lista_espera'
    )

    fecha_inscripcion = models.DateTimeField(auto_now_add=True)

    notificado = models.BooleanField(default=False)

    # Para la regla de las 2 horas de Laura
    fecha_notificacion = models.DateTimeField(
        null=True,
        blank=True
    )

    def __str__(self):
        return f'{self.paciente} - {self.clase}'
