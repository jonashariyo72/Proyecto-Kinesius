from rest_framework import serializers
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
import re
from .models import Usuario, Cliente, Kinesiologo, Administrador


#Validadores

def validar_password(password):
    if not (8 <= len(password) <= 16):
        raise serializers.ValidationError(
            'Error al registrar el nuevo usuario porque la contraseña no cumple los requisitos indicados.'
        )
    if not re.search(r'[A-Z]', password):
        raise serializers.ValidationError(
            'Error al registrar el nuevo usuario porque la contraseña no cumple los requisitos indicados.'
        )
    if not re.search(r'[!@#$%^&*(),.?":{}|<>/\\\-_+=;\'`~\[\]]', password):
        raise serializers.ValidationError(
            'Error al registrar el nuevo usuario porque la contraseña no cumple los requisitos indicados.'
        )
    return password


def validar_dni(dni):
    if not re.match(r'^\d{7,8}$', dni):
        raise serializers.ValidationError(
            'Error al registrar el nuevo usuario porque el DNI ingresado no es válido.'
        )
    return dni


def validar_email_formato(email):
    try:
        validate_email(email)
    except ValidationError:
        raise serializers.ValidationError(
            'Error al registrar el nuevo usuario porque el mail ingresado no es válido.'
        )
    return email


class RegistroClienteSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model  = Usuario
        fields = ['nombre', 'apellido', 'dni', 'email', 'password']

    def validate_email(self, value):
        validar_email_formato(value)
        if Usuario.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                'Error al registrar el nuevo usuario por correo electrónico ya existente en el sistema.'
            )
        return value

    def validate_dni(self, value):
        validar_dni(value)
        if Usuario.objects.filter(dni=value).exists():
            raise serializers.ValidationError(
                'Error al registrar el nuevo usuario por DNI ya existente en el sistema.'
            )
        return value

    def validate_password(self, value):
        return validar_password(value)

    def create(self, validated_data):
        password = validated_data.pop('password')
        usuario  = Usuario.objects.create_user(password=password, **validated_data)
        Cliente.objects.create(usuario=usuario)
        return usuario




class RegistroKinesiologoSerializer(serializers.ModelSerializer):

    class Meta:
        model  = Usuario
        fields = ['nombre', 'apellido', 'dni', 'email']

    def validate_email(self, value):
        validar_email_formato(value)
        if not value.endswith('@empleadoKinescius'):
            raise serializers.ValidationError(
                'Error al registrar el nuevo kinesiólogo porque el mail ingresado no es válido.'
            )
        if Usuario.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                'Error al registrar el nuevo kinesiólogo por correo electrónico ya existente en el sistema.'
            )
        return value

    def validate_dni(self, value):
        validar_dni(value)
        if Usuario.objects.filter(dni=value).exists():
            raise serializers.ValidationError(
                'Error al registrar el nuevo kinesiólogo por DNI ya existente en el sistema.'
            )
        return value

    def create(self, validated_data):
        import secrets
        import string
        caracteres = string.ascii_letters + string.digits + '!@#$%'
        password   = 'K' + ''.join(secrets.choice(caracteres) for _ in range(12)) + '!'
        usuario    = Usuario.objects.create_user(password=password, **validated_data)
        Kinesiologo.objects.create(usuario=usuario)
        # TODO: enviar mail con la contraseña generada
        return usuario



class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)



# Verificación 2FA (solo Admin)

class Verificacion2FASerializer(serializers.Serializer):
    email  = serializers.EmailField()
    codigo = serializers.CharField(max_length=6)