from django.db import models
from django.core.exceptions import ValidationError
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
    fecha_clase      = models.DateField(null=True, blank=True)
    hora_inicio      = models.TimeField()
    duracion_minutos = models.PositiveIntegerField(default=60)
    capacidad_maxima = models.PositiveIntegerField()
    precio           = models.DecimalField(max_digits=10, decimal_places=2)
    activa           = models.BooleanField(default=True)
    sala             = models.PositiveIntegerField(null=True, blank=True)

    kinesiologo = models.ForeignKey(
        Kinesiologo,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='clases'
    )

    class Meta:
        verbose_name = 'Clase'
        ordering = ['fecha_clase', 'hora_inicio']

    def __str__(self):
        return f'{self.get_tipo_display()} - {self.get_dia_display()} {self.hora_inicio}'

    def clean(self):

        # Validar misma sala, mismo día y horario
        conflicto_sala = Clase.objects.filter(
            dia=self.dia,
            hora_inicio=self.hora_inicio,
            sala=self.sala,
            activa=True
        ).exclude(id=self.id)

        if conflicto_sala.exists():
            raise ValidationError({
                'sala': 'Ya existe una clase en esa sala, día y horario.'
            })

        # Validar mismo kinesiólogo, mismo día y horario
        conflicto_kinesiologo = Clase.objects.filter(
            dia=self.dia,
            hora_inicio=self.hora_inicio,
            kinesiologo=self.kinesiologo,
            activa=True
        ).exclude(id=self.id)

        if conflicto_kinesiologo.exists():
            raise ValidationError({
                'kinesiologo': 'El kinesiólogo ya tiene una clase asignada en ese horario.'
            })

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def cupos_disponibles(self):
        from apps.reservas.models import Reserva

        reservas_activas = Reserva.objects.filter(
            clase=self,
            estado='CONFIRMADA'
        ).count()

        return self.capacidad_maxima - reservas_activas

    def tiene_cupo(self):
        return self.cupos_disponibles() > 0