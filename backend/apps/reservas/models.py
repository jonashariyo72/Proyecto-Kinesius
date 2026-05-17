from django.db import models
from apps.usuarios.models import Cliente
from apps.clases.models import Clase


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

    asistio = models.BooleanField(default=False)

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