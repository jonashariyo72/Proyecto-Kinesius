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

from .permissions import EsAdministrador, EsAdminOKinesiologo
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
        dominio = email.split('@')[-1].lower()

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

        elif dominio == 'kinescius.com':

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

            if user.cliente.suspendido:
                return Response(
                    {
                        'error': 'Tu cuenta se encuentra suspendida. Debes presentarte presencialmente en el centro para regularizar tu situacion.'
                    },
                    status=status.HTTP_403_FORBIDDEN
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
        from django.db.models import Count, Q

        query = request.query_params.get('q', '').strip()

        kines = Kinesiologo.objects.select_related('usuario').filter(
            usuario__is_active=True
        ).annotate(cantidad_clases=Count('clases', filter=Q(clases__activa=True)))

        if query:
            es_dni = query.replace(' ', '').isdigit()
            if es_dni:
                kines = kines.filter(usuario__dni__icontains=query)
            else:
                from django.db.models import Q as DQ
                partes = query.split()
                q_filter = DQ()
                for parte in partes:
                    q_filter |= DQ(usuario__nombre__icontains=parte) | DQ(usuario__apellido__icontains=parte)
                kines = kines.filter(q_filter)

            if not kines.exists():
                mensaje = (
                    'No hay coincidencias para el DNI ingresado'
                    if es_dni else
                    'No hay coincidencias para el nombre ingresado'
                )
                return Response({'error': mensaje}, status=status.HTTP_404_NOT_FOUND)

        data = [
            {
                'id':              k.id,
                'nombre':          f'{k.usuario.nombre} {k.usuario.apellido}',
                'apellido':        k.usuario.apellido,
                'dni':             k.usuario.dni,
                'email':           k.usuario.email,
                'cantidad_clases': k.cantidad_clases,
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

    
class PerfilKinesiologoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        kine = getattr(request.user, 'kinesiologo', None)
        if not kine:
            return Response({'error': 'No es kinesiólogo'}, status=403)
        return Response({'id': kine.id, 'nombre': request.user.nombre, 'apellido': request.user.apellido})


# views.py de usuarios
class PerfilClienteView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cliente = getattr(request.user, 'cliente', None)

        if not cliente:
            return Response(
                {'error': 'No es cliente'},
                status=403
            )

        return Response({
            'id': cliente.id,
            'nombre': request.user.nombre,
            'apellido': request.user.apellido,
            'email': request.user.email,
            'es_abonado': cliente.es_abonado,
            'suspendido': cliente.suspendido,
            'fecha_venc_cuota': cliente.fecha_venc_cuota,
            'cant_cancelaciones': cliente.cant_cancelaciones,
        })

    
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

        link = f"http://localhost:5173/reset-password?email={email}"
        # send_mail(
        #     subject='Recuperación de contraseña',
        #     message=f'Ingresá al siguiente enlace para cambiar tu contraseña:\n\n{link}',
        #     from_email='info@kinescius.com.ar',
        #     recipient_list=[email],
        #     fail_silently=True,
        # )

        send_mail(
            subject='Recuperación de contraseña - Kinescius',
            message=f'Ingresá al siguiente enlace para cambiar tu contraseña: {link}',
            from_email='info@kinescius.com.ar',
            recipient_list=[email],
            fail_silently=True,
            html_message=f'''
                <h2>Recuperación de contraseña</h2>

                <p>Hacé click en el botón para cambiar tu contraseña:</p>

                <a href="{link}"
                style="
                    background:#2e7d32;
                    color:white;
                    padding:12px 20px;
                    text-decoration:none;
                    border-radius:8px;
                    display:inline-block;
                ">
                Cambiar contraseña
                </a>
            '''
        )

        return Response(
            {'mensaje': 'Se envió el mail de recuperación'},
            status=status.HTTP_200_OK
        )
    
class ResetPasswordPublicView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):

        email = request.data.get('email')
        password = request.data.get('password')
        confirmar = request.data.get('confirmar')

        if not email or not password or not confirmar:
            return Response(
                {'error': 'Por favor, complete todos los campos'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if password != confirmar:
            return Response(
                {'error': 'Las contraseñas no coinciden'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = Usuario.objects.get(email=email)

        except Usuario.DoesNotExist:
            return Response(
                {'error': 'Usuario no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            validar_password2(password)

        except Exception as e:
            return Response(
                {'error': e.detail[0]},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(password)
        user.save()

        return Response(
            {'mensaje': 'Contraseña actualizada correctamente'},
            status=status.HTTP_200_OK
        )


# Dar de baja un cliente o kinesiólogo

class BajaUsuarioView(APIView):
    permission_classes = [EsAdministrador]

    def post(self, request):
        from apps.reservas.models import Reserva
        from apps.clases.models import Clase

        dni  = request.data.get('dni', '').strip()
        rol  = request.data.get('rol', '').strip()  # 'cliente' o 'kinesiologo'
        # Para reasignación de clases cuando se da de baja un kine
        nuevo_kine_id = request.data.get('nuevo_kinesiologo_id', None)

        if not dni:
            return Response(
                {'error': 'Por favor, ingrese un DNI.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not rol or rol not in ('cliente', 'kinesiologo'):
            return Response(
                {'error': 'Por favor, indique el rol: "cliente" o "kinesiologo".'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Buscar usuario según rol
        if rol == 'cliente':
            try:
                usuario = Usuario.objects.get(dni=dni, cliente__isnull=False)
            except Usuario.DoesNotExist:
                return Response(
                    {'error': 'Error en la baja por DNI no perteneciente a un usuario'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # No se puede dar de baja si tiene reservas activas
            reservas_activas = Reserva.objects.filter(
                paciente=usuario.cliente,
                estado__in=('CONFIRMADA', 'PENDIENTE')
            ).exists()

            if reservas_activas:
                return Response(
                    {'error': 'No se puede dar de baja al cliente porque tiene reservas activas.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        else:  # kinesiologo
            try:
                usuario = Usuario.objects.get(dni=dni, kinesiologo__isnull=False)
            except Usuario.DoesNotExist:
                return Response(
                    {'error': 'Error en la baja por DNI no perteneciente a un usuario'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Verificar si tiene clases asignadas
            clases_asignadas = Clase.objects.filter(
                kinesiologo=usuario.kinesiologo,
                activa=True
            )

            if clases_asignadas.exists():
                # Si no se mandó un nuevo kinesiólogo, pedir reasignación
                if not nuevo_kine_id:
                    todos_los_kines = Kinesiologo.objects.select_related('usuario').filter(
                        usuario__is_active=True
                    ).exclude(id=usuario.kinesiologo.id)

                    clases_data = []
                    for c in clases_asignadas:
                        # Kinesiólogos que YA tienen una clase activa ese mismo día y horario
                        ocupados_ids = Clase.objects.filter(
                            dia=c.dia,
                            hora_inicio=c.hora_inicio,
                            activa=True,
                        ).exclude(id=c.id).values_list('kinesiologo_id', flat=True)

                        disponibles = [
                            {'id': k.id, 'nombre': f'{k.usuario.nombre} {k.usuario.apellido}'}
                            for k in todos_los_kines
                            if k.id not in ocupados_ids
                        ]

                        clases_data.append({
                            'id':          c.id,
                            'tipo':        c.get_tipo_display(),
                            'dia':         c.get_dia_display(),
                            'hora_inicio': str(c.hora_inicio),
                            'kinesiologos_disponibles': disponibles,
                        })

                    return Response(
                        {
                            'requiere_reasignacion': True,
                            'clases': clases_data,
                            'mensaje': 'El kinesiólogo tiene clases asignadas. Seleccioná un kinesiólogo disponible para cada una.'
                        },
                        status=status.HTTP_200_OK
                    )

                # nuevo_kine_id ahora es un dict { clase_id: kinesiologo_id }
                import json
                if isinstance(nuevo_kine_id, str):
                    try:
                        asignaciones = json.loads(nuevo_kine_id)
                    except (ValueError, TypeError):
                        return Response(
                            {'error': 'Formato de reasignación inválido.'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                else:
                    asignaciones = nuevo_kine_id

                for c in clases_asignadas:
                    kine_id = asignaciones.get(str(c.id))
                    if not kine_id:
                        return Response(
                            {'error': f'Falta seleccionar un kinesiólogo para la clase {c.get_tipo_display()} ({c.get_dia_display()} {c.hora_inicio}).'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    try:
                        nuevo_kine = Kinesiologo.objects.get(id=kine_id, usuario__is_active=True)
                    except Kinesiologo.DoesNotExist:
                        return Response(
                            {'error': 'Uno de los kinesiólogos seleccionados no existe o está inactivo.'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    # Re-validar conflicto de horario (por seguridad ante condiciones de carrera)
                    conflicto = Clase.objects.filter(
                        dia=c.dia,
                        hora_inicio=c.hora_inicio,
                        kinesiologo=nuevo_kine,
                        activa=True,
                    ).exclude(id=c.id).exists()

                    if conflicto:
                        return Response(
                            {'error': f'El kinesiólogo seleccionado ya tiene una clase asignada el {c.get_dia_display()} a las {c.hora_inicio}.'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    c.kinesiologo = nuevo_kine
                    c.save()

        if hasattr(usuario, 'administrador'):
            return Response(
                {'error': 'No se puede dar de baja a un Administrador'},
                status=status.HTTP_403_FORBIDDEN
            )

        if not usuario.is_active:
            return Response(
                {'error': 'El usuario ya se encuentra dado de baja'},
                status=status.HTTP_400_BAD_REQUEST
            )

        usuario.is_active = False
        usuario.save()

        return Response(
            {'mensaje': 'Baja exitosa'},
            status=status.HTTP_200_OK
        )


# Buscar cliente por nombre o DNI (Admin o Kinesiólogo)

class BuscarClienteView(APIView):
    permission_classes = [EsAdminOKinesiologo]

    def get(self, request):
        query = request.query_params.get('q', '').strip()

        if not query:
            return Response(
                {'error': 'Por favor, ingrese un nombre o DNI para buscar.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        es_dni = query.replace(' ', '').isdigit()

        if es_dni:
            clientes = Cliente.objects.select_related('usuario').filter(
                usuario__dni__icontains=query,
                usuario__is_active=True,
            )
        else:
            from django.db.models import Q
            partes = query.split()
            q_filter = Q()
            for parte in partes:
                q_filter |= Q(usuario__nombre__icontains=parte) | Q(usuario__apellido__icontains=parte)

            clientes = Cliente.objects.select_related('usuario').filter(
                q_filter,
                usuario__is_active=True,
            ).distinct()

        if not clientes.exists():
            mensaje = (
                'No hay coincidencias para el DNI ingresado'
                if es_dni else
                'No hay coincidencias para el nombre ingresado'
            )
            return Response({'error': mensaje}, status=status.HTTP_404_NOT_FOUND)

        data = [
            {
                'id':       c.id,
                'nombre':   c.usuario.nombre,
                'apellido': c.usuario.apellido,
                'dni':      c.usuario.dni,
                'email':    c.usuario.email,
                'telefono': c.usuario.telefono or '',
                'es_abonado':         c.es_abonado,
                'fecha_venc_cuota':   str(c.fecha_venc_cuota) if c.fecha_venc_cuota else None,
                'suspendido':         c.suspendido,
                'cant_cancelaciones': c.cant_cancelaciones,
            }
            for c in clientes
        ]

        return Response(data, status=status.HTTP_200_OK)


# Buscar cliente dentro de las clases del kinesiólogo logueado

class BuscarClienteKinesiologoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.reservas.models import Reserva
        from django.db.models import Q

        kine = getattr(request.user, 'kinesiologo', None)
        if not kine:
            return Response({'error': 'No es kinesiólogo'}, status=403)

        query = request.query_params.get('q', '').strip()

        if not query:
            return Response(
                {'error': 'Por favor, ingrese un nombre o DNI para buscar.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Clientes que tienen reservas CONFIRMADAS en clases de este kine
        clientes_base = Cliente.objects.select_related('usuario').filter(
            reservas__clase__kinesiologo=kine,
            reservas__estado='CONFIRMADA',
            usuario__is_active=True,
        )

        # Si se pasa clase_id, filtrar solo esa clase
        clase_id = request.query_params.get('clase_id', None)
        if clase_id:
            clientes_base = clientes_base.filter(reservas__clase__id=clase_id)

        clientes_base = clientes_base.distinct()

        es_dni = query.replace(' ', '').isdigit()

        if es_dni:
            clientes = clientes_base.filter(usuario__dni__icontains=query)
        else:
            partes = query.split()
            q_filter = Q()
            for parte in partes:
                q_filter |= Q(usuario__nombre__icontains=parte) | Q(usuario__apellido__icontains=parte)
            clientes = clientes_base.filter(q_filter)

        if not clientes.exists():
            mensaje = (
                'No hay coincidencias para el DNI ingresado'
                if es_dni else
                'No hay coincidencias para el nombre ingresado'
            )
            return Response({'error': mensaje}, status=status.HTTP_404_NOT_FOUND)

        data = [
            {
                'id':       c.id,
                'nombre':   c.usuario.nombre,
                'apellido': c.usuario.apellido,
                'dni':      c.usuario.dni,
                'email':    c.usuario.email,
                'telefono': c.usuario.telefono or '',
                'es_abonado':         c.es_abonado,
                'suspendido':         c.suspendido,
                'cant_cancelaciones': c.cant_cancelaciones,
            }
            for c in clientes
        ]

        return Response(data, status=status.HTTP_200_OK)


class ListaClientesView(APIView):
    """
    GET /usuarios/clientes/
    Solo accesible por administradores.
    Devuelve la lista de todos los clientes registrados.
    """
    permission_classes = [EsAdministrador]
 
    def get(self, request):
        clientes = Cliente.objects.select_related('usuario').filter(usuario__is_active=True)
 
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
