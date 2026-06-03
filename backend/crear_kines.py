import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.usuarios.models import Usuario, Kinesiologo

kinesiólogos = [
    ('Carlos',    'Ramírez',   '30111001'),
    ('Lucía',     'Fernández', '30111002'),
    ('Martín',    'González',  '30111003'),
    ('Valeria',   'López',     '30111004'),
    ('Diego',     'Martínez',  '30111005'),
    ('Sofía',     'Pérez',     '30111006'),
    ('Nicolás',   'García',    '30111007'),
    ('Camila',    'Rodríguez', '30111008'),
    ('Facundo',   'Sánchez',   '30111009'),
    ('Agustina',  'Torres',    '30111010'),
    ('Sebastián', 'Flores',    '30111011'),
    ('Florencia', 'Díaz',      '30111012'),
    ('Matías',    'Ruiz',      '30111013'),
    ('Julieta',   'Moreno',    '30111014'),
    ('Ignacio',   'Vargas',    '30111015'),
]

for nombre, apellido, dni in kinesiólogos:
    email = f'{nombre.lower()}.{apellido.lower()}@empleadokinescius.com'
    user  = Usuario.objects.create_user(
        email=email, password='Kine1234!',
        nombre=nombre, apellido=apellido, dni=dni
    )
    Kinesiologo.objects.create(usuario=user)

print('15 kinesiólogos creados')