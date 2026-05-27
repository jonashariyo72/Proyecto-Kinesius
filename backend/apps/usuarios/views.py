from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import update_session_auth_hash
import random
import string
from .serializers import validar_password2

from .permissions import EsAdministrador
from .models import Usuario, Administrador, Kinesiologo, Cliente
from .serializers import (
    RegistroClienteSerializer,
    RegistroKinesiologoSerializer,
    LoginSerializer,
    Verificacion2FASerializer,
)



# Helpers

def get_tokens(user):
    refresh = RefreshToken.for_user(user)

    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


def generar_codigo_2fa():
    return ''.join(random.choices(string.digits, k=6))



# Registro Cliente

class RegistroClienteView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegistroClienteSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()

            return Response(
                {'mensaje': 'Usuario creado exitosamente'},
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



# Registrar Kinesiólogo, limitado solo a los Administradores.

class RegistroKinesiologoView(APIView):
    permission_classes = [EsAdministrador]

    def post(self, request):
        serializer = RegistroKinesiologoSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()

            return Response(
                {'mensaje': 'Usuario de kinesiólogo creado exitosamente'},
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



# Login

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        # Verificar si el mail existe
        if not Usuario.objects.filter(email=email).exists():
            return Response(
                {
                    'error': 'Error: el mail ingresado no se encuentra registrado en el sistema'
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Verificar credenciales
        user = authenticate(
            request,
            username=email,
            password=password
        )

        if user is None:
            return Response(
                {
                    'error': 'Error: El mail y la contraseña no coinciden para un usuario registrado'
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Detectar rol por dominio del mail

        if '@adminkinescius' in email:

            if not hasattr(user, 'administrador'):
                return Response(
                    {
                        'error': 'Error: el mail ingresado no se encuentra registrado en el sistema'
                    },
                    status=status.HTTP_401_UNAUTHORIZED
                )

            codigo = generar_codigo_2fa()
            expiracion = timezone.now() + timezone.timedelta(minutes=10)

            user.administrador.codigo_2fa = codigo
            user.administrador.codigo_2fa_expiracion = expiracion
            user.administrador.save()

            send_mail(
                subject='Código de verificación - Kinescius',
                message=f'Tu código de verificación es: {codigo}',
                from_email='info@kinescius.com.ar',
                recipient_list=[user.email],
                fail_silently=True,
            )

            return Response(
                {
                    'mensaje': 'Código enviado al mail',
                    'requiere_2fa': True
                },
                status=status.HTTP_200_OK
            )

        elif '@empleadokinescius' in email:

            if not hasattr(user, 'kinesiologo'):
                return Response(
                    {
                        'error': 'Error: el mail ingresado no se encuentra registrado en el sistema'
                    },
                    status=status.HTTP_401_UNAUTHORIZED
                )

            return Response(
                {
                    **get_tokens(user),
                    'rol': 'kinesiologo'
                },
                status=status.HTTP_200_OK
            )

        else:

            if not hasattr(user, 'cliente'):
                return Response(
                    {
                        'error': 'Error: el mail ingresado no se encuentra registrado en el sistema'
                    },
                    status=status.HTTP_401_UNAUTHORIZED
                )

            return Response(
                {
                    **get_tokens(user),
                    'rol': 'cliente'
                },
                status=status.HTTP_200_OK
            )



class Verificacion2FAView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = Verificacion2FASerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        email = serializer.validated_data['email']
        codigo = serializer.validated_data['codigo']

        try:
            user = Usuario.objects.get(email=email)

        except Usuario.DoesNotExist:
            return Response(
                {'error': 'Usuario no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        admin = getattr(user, 'administrador', None)

        if admin is None:
            return Response(
                {'error': 'Este usuario no es administrador'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verificar expiración

        if timezone.now() > admin.codigo_2fa_expiracion:
            return Response(
                {'error': 'El código ha expirado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar código

        if admin.codigo_2fa != codigo:
            return Response(
                {'error': 'El código ingresado es incorrecto'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Limpiar código y devolver JWT

        admin.codigo_2fa = None
        admin.codigo_2fa_expiracion = None
        admin.save()

        return Response(
            {
                **get_tokens(user),
                'rol': 'administrador'
            },
            status=status.HTTP_200_OK
        )



# Lista de kinesiólogos

class ListaKinesiologosView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        kines = Kinesiologo.objects.select_related('usuario').all()

        data = [
            {
                'id': k.id,
                'nombre': f'{k.usuario.nombre} {k.usuario.apellido}',
            }
            for k in kines
        ]

        return Response(data)
    

# Cambiar contraseña

class CambiarPasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):

        password = request.data.get('password')
        confirmar = request.data.get('confirmar')

        # Validar campos vacíos
        if not password or not confirmar:
            return Response(
                {'error': 'Por favor, complete todos los campos'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar coincidencia
        if password != confirmar:
            return Response(
                {'error': 'Las contraseñas no coinciden'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validar restricciones de contraseña
        try:
            validar_password2(password)

        except Exception as e:
            return Response(
                {
                    'error': e.detail[0]
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Cambiar contraseña
        user = request.user
        user.set_password(password)
        user.save()

        # Mantener sesión activa
        update_session_auth_hash(request, user)

        return Response(
            {'mensaje': 'Contraseña actualizada correctamente'},
            status=status.HTTP_200_OK
        )
    
# views.py de usuarios
class PerfilClienteView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cliente = getattr(request.user, 'cliente', None)
        if not cliente:
            return Response({'error': 'No es cliente'}, status=403)
        return Response({'id': cliente.id, 'email': request.user.email})
    
#Recuperar contraseña
class RecuperarPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):

        email = request.data.get('email')

        if not email:
            return Response(
                {'error': 'Por favor, ingrese un correo electronico'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = Usuario.objects.get(email=email)

        except Usuario.DoesNotExist:
            return Response(
                {'error': 'El mail no se encuentra registrado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        send_mail(
            subject='Recuperación de contraseña',
            message='Se solicitó recuperar la contraseña de tu cuenta.',
            from_email='info@kinescius.com.ar',
            recipient_list=[email],
            fail_silently=True,
        )

        return Response(
            {'mensaje': 'Se envió el mail de recuperación'},
            status=status.HTTP_200_OK
        )


 
class ListaClientesView(APIView):
    """
    GET /usuarios/clientes/
    Solo accesible por administradores.
    Devuelve la lista de todos los clientes registrados.
    """
    permission_classes = [EsAdministrador]
 
    def get(self, request):
        clientes = Cliente.objects.select_related('usuario').all()
 
        data = [
            {
                'id':                 c.id,
                'nombre':             c.usuario.nombre,
                'apellido':           c.usuario.apellido,
                'dni':                c.usuario.dni,
                'email':              c.usuario.email,
                'telefono':           c.usuario.telefono or '',
                'es_abonado':         c.es_abonado,
                'fecha_venc_cuota':   str(c.fecha_venc_cuota) if c.fecha_venc_cuota else None,
                'suspendido':         c.suspendido,
                'cant_cancelaciones': c.cant_cancelaciones,
            }
            for c in clientes
        ]
 
        return Response(data, status=status.HTTP_200_OK)