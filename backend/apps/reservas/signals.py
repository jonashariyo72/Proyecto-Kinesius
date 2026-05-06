from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.utils import timezone
from .models import Reserva, ListaEspera
# from clases.models import Clase 

@receiver(pre_delete, sender='clases.Clase')
def gestionar_cancelacion_clase_masiva(sender, instance, **kwargs):
    """
    HU: ELIMINAR CLASE - Escenario 1
    Cuando el admin borra una clase, se cancelan reservas y se asigna saldo a favor.
    """
    reservas_activas = Reserva.objects.filter(clase=instance).exclude(estado='CANCELADA')
    
    for reserva in reservas_activas:
        perfil = reserva.paciente
        
        # Asignar saldo a favor si no es abonado (pagó seña) o según política
        # perfil.saldo_a_favor += instance.precio_clase 
        # perfil.save()
        
        # Cambiar estado de la reserva
        reserva.estado = 'CANCELADA'
        reserva.save()
        
        # Enviar notificación (Simulado)
        print(f"Notificación enviada a {perfil.user.email}: Clase de las {instance.hora_inicio} cancelada.")

@receiver(post_save, sender=Reserva)
def gestionar_cupo_liberado(sender, instance, created, **kwargs):
    """
    Lógica para LISTA DE ESPERA (Regla de las 2 horas)
    Si una reserva se cancela, avisamos al siguiente en la lista.
    """
    if not created and instance.estado == 'CANCELADA':
        clase = instance.clase
        siguiente_en_espera = ListaEspera.objects.filter(
            clase=clase, 
            notificado=False
        ).order_by('fecha_inscripcion').first()

        if siguiente_en_espera:
            siguiente_en_espera.notificado = True
            siguiente_en_espera.fecha_notificacion = timezone.now()
            siguiente_en_espera.save()
            
            # Enviar notificación de "Tenés 2 horas para confirmar tu cupo"
            print(f"Cupo liberado. Notificando a: {siguiente_en_espera.paciente}")