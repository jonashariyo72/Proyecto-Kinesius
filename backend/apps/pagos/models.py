from django.db import models
from apps.usuarios.models import Cliente
from apps.reservas.models import Reserva
from dateutil.relativedelta import relativedelta
from django.utils import timezone

class PagoReserva(models.Model):

    TIPO_PAGO_CHOICES = [
        ('sena',  'Seña (50%)'),
        ('total', 'Total'),
    ]

    METODO_PAGO_CHOICES = [
        ('mercadopago', 'Mercado Pago'),
        ('tarjeta',     'Tarjeta'),
        ('saldo',       'Saldo a Favor'),  # ← nuevo
    ]

    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('aprobado',  'Aprobado'),
        ('rechazado', 'Rechazado'),
    ]

    monto_devuelto = models.DecimalField(
        max_digits=10, decimal_places=2,
        default=0,
        help_text='Monto devuelto al cliente en caso de cancelación'
    )
    reserva = models.OneToOneField(
        Reserva,
        on_delete=models.CASCADE,
        related_name='pago'
    )
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name='pagos'
    )

    tipo_pago   = models.CharField(max_length=10, choices=TIPO_PAGO_CHOICES)
    metodo_pago = models.CharField(max_length=20, choices=METODO_PAGO_CHOICES)
    estado      = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')

    monto_total_clase = models.DecimalField(
        max_digits=10, decimal_places=2,
        help_text='Precio completo de la clase al momento de pagar'
    )
    monto_abonado = models.DecimalField(
        max_digits=10, decimal_places=2,
        help_text='Lo que efectivamente pagó: 50% si es seña, 100% si es total'
    )

    id_transaccion_externa = models.CharField(max_length=255, blank=True, null=True)

    creado_en      = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Pago de Reserva'
        ordering     = ['-creado_en']

    def __str__(self):
        return (f'Pago #{self.pk} | Reserva #{self.reserva_id} | '
                f'{self.get_tipo_pago_display()} | {self.get_estado_display()}')

    @property
    def saldo_pendiente(self):
        """Cuánto le queda por pagar si eligió seña."""
        return self.monto_total_clase - self.monto_abonado
    
class PagoCuota(models.Model):
   
 
        METODO_PAGO_CHOICES = [
            ('mercadopago', 'Mercado Pago'),
            ('efectivo',    'Efectivo'),
        ]
    
        ESTADO_CHOICES = [
            ('pendiente', 'Pendiente'),
            ('aprobado',  'Aprobado'),
            ('rechazado', 'Rechazado'),
        ]
    
        cliente = models.ForeignKey(
            Cliente,
            on_delete=models.CASCADE,
            related_name='pagos_cuota'
        )
    
        monto = models.DecimalField(max_digits=10, decimal_places=2)
    
        metodo_pago = models.CharField(max_length=20, choices=METODO_PAGO_CHOICES)
        estado      = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    
        # Mes/año al que corresponde esta cuota (ej: 2026-06-01 representa Junio 2026)
        periodo = models.DateField(help_text='Primer día del mes que cubre esta cuota')
    
        id_transaccion_externa = models.CharField(max_length=255, blank=True, null=True)
    
        # Quién la registró si fue manual (efectivo)
        registrado_por = models.ForeignKey(
            'usuarios.Administrador',
            on_delete=models.SET_NULL,
            null=True, blank=True,
            related_name='cuotas_registradas'
        )
    
        creado_en      = models.DateTimeField(auto_now_add=True)
        actualizado_en = models.DateTimeField(auto_now=True)
    
        class Meta:
            verbose_name = 'Pago de Cuota'
            ordering     = ['-creado_en']
    
        def __str__(self):
            return f'Cuota #{self.pk} | {self.cliente} | {self.periodo.strftime("%m/%Y")} | {self.get_estado_display()}'