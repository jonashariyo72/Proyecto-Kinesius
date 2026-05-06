from django.db import models
from apps.usuarios.models import Cliente
# Importamos el modelo de clases/sesiones que está haciendo tu compañero
# from clases.models import Sesion 

class Reserva(models.Model):
    ESTADOS = (
        ('CONFIRMADA', 'Confirmada'),
        ('PENDIENTE', 'Pendiente de Pago'),
        ('CANCELADA', 'Cancelada'),
    )
    
    paciente = models.ForeignKey(Cliente, on_delete=models.CASCADE)
    # sesion = models.ForeignKey('clases.Sesion', on_delete=models.CASCADE)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='PENDIENTE')
    asistio = models.BooleanField(default=False) # Para la HU de marcar con QR

class ListaEspera(models.Model):
    paciente = models.ForeignKey(Cliente, on_delete=models.CASCADE)
    # sesion = models.ForeignKey('clases.Sesion', on_delete=models.CASCADE)
    fecha_inscripcion = models.DateTimeField(auto_now_add=True)
    notificado = models.BooleanField(default=False)
    # Para la regla de las 2 horas de Laura
    fecha_notificacion = models.DateTimeField(null=True, blank=True)