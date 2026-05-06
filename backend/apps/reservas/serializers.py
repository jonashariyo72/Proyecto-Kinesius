from rest_framework import serializers
from .models import Reserva, ListaEspera
from apps.usuarios.models import Cliente
# from clases.models import Clase 

class ReservaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reserva
        fields = ['id', 'paciente', 'clase', 'fecha_creacion', 'estado', 'asistio']
        read_only_fields = ['fecha_creacion', 'asistio']

    def validate(self, data):
        clase = data['clase']
        paciente = data['paciente']

        # Validación de cupo
        if clase.reservas_actuales >= clase.limite_personas:
            raise serializers.ValidationError(
                "La clase ha alcanzado su límite de capacidad. Podés anotarte en Lista de Espera."
            )

        # Validación de Suspensión
        if paciente.esta_suspendido:
            raise serializers.ValidationError(
                "Tu cuenta se encuentra suspendida para nuevas reservas por inasistencias previas."
            )

        #  se fija si ya está anotado a esta clase
        if Reserva.objects.filter(paciente=paciente, clase=clase, estado='CONFIRMADA').exists():
            raise serializers.ValidationError("Ya tenés una reserva confirmada para esta clase.")

        return data

class ListaEsperaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListaEspera
        fields = '__all__'
        fields = '__all__'