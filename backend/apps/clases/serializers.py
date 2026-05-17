from rest_framework import serializers
from .models import Clase
from apps.usuarios.models import Kinesiologo


class ClaseSerializer(serializers.ModelSerializer):
    cupos_disponibles = serializers.SerializerMethodField()
    tiene_cupo        = serializers.SerializerMethodField()
    kinesiologo_nombre = serializers.SerializerMethodField()

    class Meta:
        model  = Clase
        fields = [
            'id', 'tipo', 'descripcion', 'dia', 'hora_inicio',
            'duracion_minutos', 'capacidad_maxima', 'precio', 'activa',
            'kinesiologo', 'kinesiologo_nombre', 'cupos_disponibles',
            'tiene_cupo', 'sala',
        ]

    def get_cupos_disponibles(self, obj):
        return obj.cupos_disponibles()

    def get_tiene_cupo(self, obj):
        return obj.tiene_cupo()

    def get_kinesiologo_nombre(self, obj):
        if obj.kinesiologo:
            return str(obj.kinesiologo.usuario)
        return None

    def validate_capacidad_maxima(self, value):
        if value <= 0:
            raise serializers.ValidationError('La capacidad debe ser mayor a 0.')
        return value

    def validate_precio(self, value):
        if value < 0:
            raise serializers.ValidationError('El precio no puede ser negativo.')
        return value

    def validate(self, data):
        """Valida que no haya más de 3 kinesiólogos asignados al mismo día y hora."""
        dia         = data.get('dia', getattr(self.instance, 'dia', None))
        hora_inicio = data.get('hora_inicio', getattr(self.instance, 'hora_inicio', None))

        clases_mismo_turno = Clase.objects.filter(
            dia=dia,
            hora_inicio=hora_inicio,
            activa=True
        )

        # Si es una actualización excluimos la instancia actual
        if self.instance:
            clases_mismo_turno = clases_mismo_turno.exclude(pk=self.instance.pk)

        if clases_mismo_turno.count() >= 3:
            raise serializers.ValidationError(
                'Ya hay 3 kinesiólogos asignados a ese día y horario. No se pueden agregar más.'
            )

        return data
