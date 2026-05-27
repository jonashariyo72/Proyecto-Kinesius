from django.db import models
from apps.usuarios.models import Cliente
from apps.reservas.models import Reserva


class PagoReserva(models.Model):

    TIPO_PAGO_CHOICES = [
        ('sena',  'Seña (50%)'),
        ('total', 'Total'),
    ]

    METODO_PAGO_CHOICES = [
        ('mercadopago', 'Mercado Pago'),
        ('tarjeta',     'Tarjeta'),
    ]

    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('aprobado',  'Aprobado'),
        ('rechazado', 'Rechazado'),
    ]

    # OneToOne porque una reserva tiene un único pago
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

    # ID que devuelve MercadoPago o el gateway de tarjeta
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