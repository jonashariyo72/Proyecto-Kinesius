from rest_framework import serializers
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
import re
from .models import Usuario, Cliente, Kinesiologo, Administrador


# Validadores

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

def validar_password2(password):
    if not (8 <= len(password) <= 16):
        raise serializers.ValidationError(
            'Error al cambiar la contraseña porque la contraseña no cumple los requisitos indicados.'
        )
    if not re.search(r'[A-Z]', password):
        raise serializers.ValidationError(
            'Error al cambiar la contraseña porque la contraseña no cumple los requisitos indicados.'
        )
    if not re.search(r'[!@#$%^&*(),.?":{}|<>/\\\-_+=;\'`~\[\]]', password):
        raise serializers.ValidationError(
            'Error al cambiar la contraseña porque la contraseña no cumple los requisitos indicados.'
        )
    return password


def validar_dni(dni):
    if not re.match(r'^\d{7,8}$', dni):
        raise serializers.ValidationError(
            'Error al registrar el nuevo usuario porque el DNI ingresado no es válido.'
        )
    return dni


def validar_dni_kine(dni):
    if not re.match(r'^\d{7,8}$', dni):
        raise serializers.ValidationError(
            'Error al registrar el nuevo kinesiólogo porque el DNI ingresado no es válido.'
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


DOMINIO_KINESIOLOGO = 'kinescius.com'


class RegistroClienteSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model  = Usuario
        fields = ['nombre', 'apellido', 'dni', 'email', 'password']
        extra_kwargs = {
            'email': {'validators': []},
        }

    def validate_email(self, value):
        validar_email_formato(value)

        dominios_permitidos = ['gmail.com', 'outlook.com', 'hotmail.com', 'unlp.edu.ar']
        dominio = value.split('@')[-1].lower()
        if dominio not in dominios_permitidos:
            raise serializers.ValidationError(
                'Solo se permiten correos de Gmail, Outlook, Hotmail o UNLP (@unlp.edu.ar).'
            )

        if Usuario.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                'Error al registrar el nuevo usuario porque el correo electrónico ya existe en el sistema.'
            )
        return value

    def validate_dni(self, value):
        validar_dni(value)
        # Un DNI puede existir como kinesiólogo pero no como otro cliente
        dni_existente = Usuario.objects.filter(dni=value, cliente__isnull=False)
        if dni_existente.exists():
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
        extra_kwargs = {
            'email': {'validators': []},
        }

    def validate_email(self, value):
        try:
            validate_email(value)
        except ValidationError:
            raise serializers.ValidationError(
                'Error al registrar el nuevo kinesiólogo porque el mail ingresado no es válido.'
            )

        dominio = value.split('@')[-1].lower()
        if dominio != DOMINIO_KINESIOLOGO:
            raise serializers.ValidationError(
                'Error al registrar el nuevo kinesiólogo porque el mail ingresado no es válido.'
            )

        if Usuario.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                'Error al registrar el nuevo kinesiólogo por correo electrónico ya existente en el sistema.'
            )
        return value

    def validate_dni(self, value):
        validar_dni_kine(value)
        # Un DNI puede existir como cliente pero no como otro kinesiólogo
        dni_existente = Usuario.objects.filter(dni=value, kinesiologo__isnull=False)
        if dni_existente.exists():
            raise serializers.ValidationError(
                'Error al registrar el nuevo kinesiólogo por DNI ya existente en el sistema.'
            )
        return value

    def create(self, validated_data):
        import secrets
        import string
        from django.core.mail import send_mail

        caracteres = string.ascii_letters + string.digits + '!@#$%'
        password   = 'K' + ''.join(secrets.choice(caracteres) for _ in range(12)) + '!'
        usuario    = Usuario.objects.create_user(password=password, **validated_data)
        Kinesiologo.objects.create(usuario=usuario)

        send_mail(
            subject='Bienvenido a Kinescius - Tus credenciales de acceso',
            message=(
                f'Hola {usuario.nombre},\n\n'
                f'Tu cuenta de kinesiólogo fue creada exitosamente.\n'
                f'Email: {usuario.email}\n'
                f'Contraseña temporal: {password}\n\n'
                f'Por seguridad, te recomendamos cambiarla al iniciar sesión por primera vez.'
            ),
            from_email='info@kinescius.com.ar',
            recipient_list=[usuario.email],
            fail_silently=True,
        )

        return usuario


class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class Verificacion2FASerializer(serializers.Serializer):
    email  = serializers.EmailField()
    codigo = serializers.CharField(max_length=6)