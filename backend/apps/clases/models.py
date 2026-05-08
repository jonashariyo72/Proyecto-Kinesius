from django.db import models
from apps.usuarios.models import Kinesiologo


class Clase(models.Model):
    TIPO_CHOICES = [
        ('tren_inferior', 'Tren Inferior'),
        ('zona_media',    'Zona Media'),
        ('tren_superior', 'Tren Superior'),
    ]

    DIA_CHOICES = [
        ('lunes',     'Lunes'),
        ('martes',    'Martes'),
        ('miercoles', 'Miércoles'),
        ('jueves',    'Jueves'),
        ('viernes',   'Viernes'),
    ]

    tipo             = models.CharField(max_length=50, choices=TIPO_CHOICES)
    descripcion      = models.TextField(blank=True, null=True)
    dia              = models.CharField(max_length=20, choices=DIA_CHOICES)
    hora_inicio      = models.TimeField()
    duracion_minutos = models.PositiveIntegerField(default=60)  # Siempre 1 hora según entrevista
    capacidad_maxima = models.PositiveIntegerField()            # Configurable por el administrador
    precio           = models.DecimalField(max_digits=10, decimal_places=2)
    activa           = models.BooleanField(default=True)

    # Máximo 3 kinesiólogos por turno (regla de negocio de la entrevista)
    kinesiologo = models.ForeignKey(
        Kinesiologo,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='clases'
    )

    class Meta:
        verbose_name = 'Clase'
        # Una misma combinación de día + hora + kinesiólogo no puede repetirse
        unique_together = ('dia', 'hora_inicio', 'kinesiologo')
        ordering = ['dia', 'hora_inicio']

    def __str__(self):
        return f'{self.get_tipo_display()} - {self.get_dia_display()} {self.hora_inicio}'

    def cupos_disponibles(self):
        """Retorna cuántos lugares quedan libres en la clase."""
        reservas_activas = self.reservas.filter(estado='confirmada').count()
        return self.capacidad_maxima - reservas_activas

    def tiene_cupo(self):
        return self.cupos_disponibles() > 0
