from rest_framework import serializers

from .models import FichaEvolucion


class FichaEvolucionSerializer(serializers.ModelSerializer):

    class Meta:
        model = FichaEvolucion
        fields = "__all__"