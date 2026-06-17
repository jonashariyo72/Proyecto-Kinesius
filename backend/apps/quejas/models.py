from django.db import models
from apps.usuarios.models import Cliente

class Queja(models.Model):

    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name='quejas'
    )

    descripcion = models.TextField()

    fecha_creacion = models.DateTimeField(
        auto_now_add=True
    )