from rest_framework import serializers
from .models import Reserva, ListaEspera
from apps.usuarios.models import Cliente
# from clases.models import Clase 

class ReservaSerializer(serializers.ModelSerializer):
    clase_tipo        = serializers.CharField(source='clase.tipo', read_only=True)
    clase_dia         = serializers.CharField(source='clase.dia', read_only=True)
    clase_hora        = serializers.TimeField(source='clase.hora_inicio', read_only=True)
    clase_kinesiologo = serializers.SerializerMethodField()
    clase_precio      = serializers.DecimalField(source='clase.precio', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model  = Reserva
        fields = [
    'id', 'paciente', 'clase', 'fecha_creacion', 'estado', 'asistio',
    'clase_tipo', 'clase_dia', 'clase_hora', 'clase_kinesiologo', 'clase_precio',
    'tipo_pago', 'fecha_reserva',
]
        read_only_fields = ['fecha_creacion', 'asistio']
    extra_kwargs = {
    'estado': {'default': 'CONFIRMADA'}
    }
    def get_clase_kinesiologo(self, obj):
        if obj.clase.kinesiologo:
            u = obj.clase.kinesiologo.usuario
            return f'{u.nombre} {u.apellido}'
        return None
    
    def validate(self, data):
        clase = data['clase']
        paciente = data['paciente']

        # Validación de cupo
        if clase.cupos_disponibles() <= 0:
            raise serializers.ValidationError(
                "La clase ha alcanzado su límite de capacidad. Podés anotarte en Lista de Espera."
            )

        # Validación de Suspensión
        if paciente.suspendido:
            raise serializers.ValidationError(
                "Tu cuenta se encuentra suspendida para nuevas reservas por inasistencias previas."
            )

        # Se fija si ya está anotado a esta clase
        if Reserva.objects.filter(paciente=paciente, clase=clase, estado__in=['CONFIRMADA', 'PENDIENTE']).exists():
            raise serializers.ValidationError("Ya tenés una reserva activa para esta clase.")

        return data

class ListaEsperaSerializer(serializers.ModelSerializer):
    paciente_nombre = serializers.SerializerMethodField()

    class Meta:
        model = ListaEspera
        fields = '__all__'

    def get_paciente_nombre(self, obj):
        u = obj.paciente.usuario
        return f'{u.nombre} {u.apellido}'