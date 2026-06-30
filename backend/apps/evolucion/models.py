from django.db import models

from apps.usuarios.models import Cliente, Kinesiologo
from apps.reservas.models import Reserva


class FichaEvolucion(models.Model):

    paciente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name="fichas_evolucion"
    )

    kinesiologo = models.ForeignKey(
        Kinesiologo,
        on_delete=models.CASCADE,
        related_name="fichas_evolucion"
    )

    reserva = models.OneToOneField(
        Reserva,
        on_delete=models.CASCADE,
        related_name="ficha_evolucion"
    )

    descripcion = models.TextField()

    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha_creacion"]

    def __str__(self):
        return f"{self.paciente} - {self.reserva.clase.fecha_clase}"