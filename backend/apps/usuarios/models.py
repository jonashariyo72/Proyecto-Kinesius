from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import RegexValidator


# Esta clase es para el registro de cualquier usuario, personalizado con nuestras reglas.
class UsuarioManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('El email es obligatorio')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields): # Esto crearía un super usuario, tipo Admin
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


# Validador del DNI
dni_validator = RegexValidator(
    regex=r'^\d{7,8}$',
    message='El DNI debe contener entre 7 y 8 dígitos numéricos.'
)


# Usuario base
class Usuario(AbstractBaseUser, PermissionsMixin):
    email    = models.EmailField(unique=True)
    nombre   = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    dni = models.CharField(max_length=8, validators=[dni_validator])
    telefono = models.CharField(max_length=20, blank=True, null=True)

    is_active = models.BooleanField(default=True)
    is_staff  = models.BooleanField(default=False)

    objects = UsuarioManager()

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['nombre', 'apellido', 'dni']

    class Meta:
        verbose_name = 'Usuario'

    def __str__(self):
        return f'{self.nombre} {self.apellido} ({self.email})'


# Clase Administrador, 
class Administrador(models.Model):
    usuario = models.OneToOneField(
        Usuario,
        on_delete=models.CASCADE,
        related_name='administrador'
    )
    # Códigos para la doble validación
    codigo_2fa            = models.CharField(max_length=6, blank=True, null=True)
    codigo_2fa_expiracion = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name = 'Administrador'

    def __str__(self):
        return f'Admin: {self.usuario}'


# Clase Kinesiólogo
class Kinesiologo(models.Model):

    usuario = models.OneToOneField(
        Usuario,
        on_delete=models.CASCADE,
        related_name='kinesiologo'
    )

    class Meta:
        verbose_name = 'Kinesiologo'

    def __str__(self):
        return f'Kinesiologo: {self.usuario}'


# Clase Cliente
class Cliente(models.Model):
    usuario = models.OneToOneField(
        Usuario,
        on_delete=models.CASCADE,
        related_name='cliente'
    )

    saldo_a_favor = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )
    # Verificación de abono
    es_abonado       = models.BooleanField(default=False)
    fecha_venc_cuota = models.DateField(blank=True, null=True)

    fecha_alta_abonado = models.DateField(
        null=True,
        blank=True
    )

    # Suspensión
    suspendido       = models.BooleanField(default=False)
    fecha_suspension = models.DateField(blank=True, null=True)

    # Cancelaciones (pierde descuento si cancela 3+ veces)
    cant_cancelaciones = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = 'Cliente'

    def __str__(self):
        estado     = 'Abonado' if self.es_abonado else 'No abonado'
        suspendido = ' - SUSPENDIDO' if self.suspendido else ''
        return f'Cliente: {self.usuario} [{estado}{suspendido}]'

    def puede_reservar(self):
        return not self.suspendido