from rest_framework import serializers

from .models import FichaEvolucion


class FichaEvolucionSerializer(serializers.ModelSerializer):

    class Meta:
        model = FichaEvolucion
        fields = "__all__"


class FichaVisualizacionSerializer(serializers.ModelSerializer):

    fecha = serializers.DateField(source="reserva.clase.fecha_clase")
    hora = serializers.TimeField(source="reserva.clase.hora_inicio")
    tipo = serializers.CharField(source="reserva.clase.get_tipo_display")
    kinesiologo = serializers.SerializerMethodField()

    class Meta:
        model = FichaEvolucion
        fields = (
            "id",
            "fecha",
            "hora",
            "tipo",
            "kinesiologo",
            "descripcion",
            "fecha_creacion",
        )

    def get_kinesiologo(self, obj):
        return (
            f"{obj.kinesiologo.usuario.nombre} "
            f"{obj.kinesiologo.usuario.apellido}"
        )