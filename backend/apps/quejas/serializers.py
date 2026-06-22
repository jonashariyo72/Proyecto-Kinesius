from rest_framework import serializers
from .models import Queja

class QuejaSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Queja
        fields = [
            'id',
            'cliente',
            'cliente_nombre',
            'descripcion',
            'fecha_creacion'
        ]

    def get_cliente_nombre(self, obj):
        return f"{obj.cliente.usuario.nombre} {obj.cliente.usuario.apellido}"