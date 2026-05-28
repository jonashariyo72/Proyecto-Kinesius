from rest_framework import serializers
from .models import Clase
from apps.usuarios.models import Kinesiologo


class ClaseSerializer(serializers.ModelSerializer):
    cupos_disponibles = serializers.SerializerMethodField()
    tiene_cupo        = serializers.SerializerMethodField()
    kinesiologo_nombre = serializers.SerializerMethodField()
    kinesiologo_email = serializers.SerializerMethodField()

    class Meta:
        model  = Clase
        fields = [
            'id', 'tipo', 'descripcion', 'dia', 'fecha_clase', 'hora_inicio',
            'duracion_minutos', 'capacidad_maxima', 'precio', 'activa',
            'kinesiologo', 'kinesiologo_nombre', 'kinesiologo_email',
            'cupos_disponibles', 'tiene_cupo', 'sala',
        ]

    def get_cupos_disponibles(self, obj):
        return obj.cupos_disponibles()

    def get_tiene_cupo(self, obj):
        return obj.tiene_cupo()

    def get_kinesiologo_nombre(self, obj):
        if obj.kinesiologo:
            return f'{obj.kinesiologo.usuario.nombre} {obj.kinesiologo.usuario.apellido}'
        return None

    def get_kinesiologo_email(self, obj):
        if obj.kinesiologo:
            return obj.kinesiologo.usuario.email
        return None

    def validate_capacidad_maxima(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                'La capacidad debe ser mayor a 0.'
            )
        return value

    def validate_precio(self, value):
        if value < 0:
            raise serializers.ValidationError(
                'El precio no puede ser negativo.'
            )
        return value

    def validate(self, data):

        fecha_clase = data.get(
            'fecha_clase',
            getattr(self.instance, 'fecha_clase', None)
        )

        hora_inicio = data.get(
            'hora_inicio',
            getattr(self.instance, 'hora_inicio', None)
        )

        sala = data.get(
            'sala',
            getattr(self.instance, 'sala', None)
        )

        kinesiologo = data.get(
            'kinesiologo',
            getattr(self.instance, 'kinesiologo', None)
        )

        # clases del mismo horario
        clases_mismo_turno = Clase.objects.filter(
            fecha_clase=fecha_clase,
            hora_inicio=hora_inicio,
            activa=True
        )

        # excluir instancia actual en edición
        if self.instance:
            clases_mismo_turno = clases_mismo_turno.exclude(
                pk=self.instance.pk
            )

        # validar sala ocupada
        if sala and clases_mismo_turno.filter(sala=sala).exists():
            raise serializers.ValidationError({
                'sala': 'Ya existe una clase en esa sala para ese horario.'
            })

        # validar kinesiólogo ocupado
        if (
            kinesiologo and
            clases_mismo_turno.filter(kinesiologo=kinesiologo).exists()
        ):
            raise serializers.ValidationError({
                'kinesiologo': (
                    'El kinesiólogo ya tiene una clase asignada en ese horario.'
                )
            })

        # máximo 3 clases por horario
        if clases_mismo_turno.count() >= 3:
            raise serializers.ValidationError({
                'hora_inicio': (
                    'Ya existen 3 clases en ese horario. '
                    'No se pueden agregar más.'
                )
            })

        return data