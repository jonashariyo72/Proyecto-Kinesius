from rest_framework import serializers
from .models import PagoReserva


class PagoReservaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PagoReserva
        fields = [
            'id', 'reserva', 'cliente', 'tipo_pago', 'metodo_pago',
            'estado', 'monto_total_clase', 'monto_abonado',
            'id_transaccion_externa', 'creado_en', 'actualizado_en',
            'saldo_pendiente',
        ]
        read_only_fields = ['creado_en', 'actualizado_en', 'saldo_pendiente']


class ConfirmarPagoSerializer(serializers.Serializer):
    pago_id               = serializers.IntegerField()
    estado                = serializers.ChoiceField(choices=['aprobado', 'rechazado'])
    id_transaccion_externa = serializers.CharField(required=False, allow_blank=True)