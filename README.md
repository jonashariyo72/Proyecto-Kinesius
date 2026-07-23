# Kinescius — Centro de Rehabilitación

Sistema web para la gestión de turnos, clases y pagos del centro de kinesiología Kinescius. Desarrollado como proyecto académico para la materia **Ingeniería de Software 2** de la Facultad de Informática, UNLP.

---

## Integrantes
- Jonás Hariyo
- Valentín Senessi
- Matías Fischer
- Manuel Haro
- Juan Cruz Serra

## Tabla de contenidos

- [Descripción general](#descripción-general)
- [Tecnologías utilizadas](#tecnologías-utilizadas)
- [Arquitectura del sistema](#arquitectura-del-sistema)
- [Roles del sistema](#roles-del-sistema)
- [Reglas de negocio](#reglas-de-negocio)
- [Backend — Django REST](#backend--django-rest)
- [Frontend — React + Vite](#frontend--react--vite)
- [Autenticación y seguridad](#autenticación-y-seguridad)
- [Configuración del entorno](#configuración-del-entorno)

---

## Descripción general

Kinescius es un centro de rehabilitación especializado en kinesiología para tren inferior, zona media y tren superior. Hasta el momento trabajaban con reservas y turnos en papel. Este sistema digitaliza la gestión completa del centro, incluyendo:

- Registro e inicio de sesión de clientes y administradores
- Creación, modificación y eliminación de clases
- Reserva de turnos con pago de seña o total
- Lista de espera con notificación por mail
- Cancelación de turnos con lógica de devolución
- Panel de administración para gestión de clases y usuarios
- Integración con Mercado Pago y pago con tarjeta

---

## Tecnologías utilizadas

### Backend
- Python 3.12
- Django 6.0.4
- Django REST Framework (DRF)
- SimpleJWT — autenticación con tokens JWT
- django-cors-headers — manejo de CORS
- django-filters — filtrado de querysets
- mercadopago SDK — integración de pagos
- python-dotenv — variables de entorno
- SQLite (base de datos en desarrollo)
- Mailtrap (SMTP sandbox para mails en desarrollo)

### Frontend
- React 18
- Vite 8
- React Router DOM — navegación entre páginas
- Axios — comunicación con la API
- react-datepicker — selector de fechas
- date-fns — utilidades de fechas

---

## Arquitectura del sistema

```
┌─────────────────────────────────────────────────────┐
│                   Frontend — React                   │
│              Vite dev server: localhost:5173          │
└───────────────────────┬─────────────────────────────┘
                        │ HTTP (Axios + JWT)
                        ▼
┌─────────────────────────────────────────────────────┐
│              Backend — Django REST                   │
│           Dev server: 127.0.0.1:8000                 │
│                                                      │
│  /api/usuarios/     /api/clases/    /api/reservas/   │
│  /api/pagos/        /api/notificaciones/             │
└───────────────────────┬─────────────────────────────┘
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
        SQLite DB           Mailtrap SMTP
       (db.sqlite3)      (sandbox emails)
```

## Roles del sistema

### Administrador
- Login con email `@adminkinescius.com` + autenticación 2FA por mail
- Crear, editar y eliminar clases
- Ver y gestionar todos los usuarios
- Anular suspensiones de clientes
- Ver reportes y estadísticas

### Kinesiólogo
- Login con email `@empleadokinescius.com`
- Ver sus clases asignadas
- Registrar asistencia de clientes

### Cliente
- Registro con email de dominio permitido (gmail, outlook, hotmail, unlp.edu.ar)
- Reservar clases (abonado o no abonado)
- Pagar seña o monto total
- Cancelar reservas
- Inscribirse a lista de espera
- Ver sus turnos

---

## Reglas de negocio

### Pagos
- Clientes **no abonados**: deben pagar seña del 50% o el total para confirmar una reserva
- Clientes **abonados**: no pagan seña
- Métodos de pago: Mercado Pago y tarjeta

### Cancelaciones (no abonados)
- Cancelación con más de 24 hs de anticipación → devolución del 100%
- Cancelación dentro de las 24 hs habiendo pagado total → devolución del 50%
- Cancelación dentro de las 24 hs habiendo pagado seña → sin devolución

### Cancelaciones (abonados)
- Cancelación dentro de las 48 hs → pierde el descuento del 20% del mes siguiente

### Descuentos (abonados)
- 20% de descuento a partir de la 3ra clase o más
- Se pierde el descuento si cancela 3 o más veces

### Suspensión
- Si un cliente no se presenta sin cancelar → suspensión automática
- No puede reservar turnos mientras esté suspendido
- Solo el administrador puede levantar la suspensión manualmente

### Lista de espera
- Si el cupo está lleno, el cliente puede anotarse a la lista de espera
- Al liberarse un lugar, se notifica por mail al primero de la lista
- El cliente tiene 2 horas para confirmar antes de que pase al siguiente

### Cuotas
- 10 días para pagar la cuota mensual
- Al día 10 sin pago → notificación por mail

### Clases
- Duración fija de 1 hora
- Máximo 3 kinesiólogos por turno
- El cupo máximo es configurable por el administrador
- Se atiende de lunes a viernes

---

## Backend — Django REST

### Modelos principales

**Usuario** (AbstractBaseUser): email, nombre, apellido, dni, telefono, is_active, is_staff
- `USERNAME_FIELD = 'email'`
- El rol se detecta por la subclase asociada (Administrador, Kinesiologo, Cliente)

**Administrador**: codigo_2fa, codigo_2fa_expiracion

**Kinesiologo**: referencia a Usuario

**Cliente**: es_abonado, fecha_venc_cuota, suspendido, fecha_suspension, cant_cancelaciones

**Clase**: tipo, descripcion, dia, hora_inicio, duracion_minutos, capacidad_maxima, precio, activa, kinesiologo (FK)

**Reserva**: paciente (FK Cliente), clase (FK Clase), estado (CONFIRMADA/PENDIENTE/CANCELADA), tipo_pago (TOTAL/SENIA), fecha_reserva, saldo_a_favor

**ListaEspera**: clase (FK), paciente (FK Cliente), fecha_inscripcion, notificado, fecha_notificacion

### Detección de rol en el login
El rol se detecta por el dominio del email:
- `@adminkinescius` → Administrador (flujo 2FA)
- `@empleadokinescius` → Kinesiólogo (JWT directo)
- Cualquier otro dominio → Cliente (JWT directo)

---

## Frontend — React + Vite

### Paleta de colores (CSS variables)
```css
--verde:        #2e7d32  /* color principal */
--verde-claro:  #4caf50
--verde-hover:  #1b5e20
--amarillo:     #f9a825  /* color secundario */
--bg:           #f7f8f5
--bg-card:      #ffffff
```

### Flujo de autenticación
1. Usuario ingresa email y contraseña en `/login`
2. Si es admin → backend responde `requiere_2fa: true` → frontend muestra input de código
3. Admin ingresa código 2FA recibido por mail → backend valida y devuelve JWT
4. Si es cliente/kine → JWT devuelto directamente
5. Token guardado en `localStorage` con clave `access`, `refresh`, `rol`
6. `AuthContext` provee el estado de sesión a toda la app
7. `axios interceptor` inyecta el token en cada request automáticamente

### Validaciones del registro (frontend, espeja el backend)
- Nombre y apellido: obligatorios
- DNI: 7 u 8 dígitos numéricos
- Email: dominio permitido (gmail.com, outlook.com, hotmail.com, unlp.edu.ar)
- Contraseña: 8-16 caracteres, al menos una mayúscula, al menos un carácter especial
- Confirmar contraseña: debe coincidir

---

## Autenticación y seguridad

- JWT con SimpleJWT
- Access token: duración 8 horas
- Refresh token: duración 1 día
- 2FA para administradores: código de 6 dígitos, expira en 10 minutos
- CORS habilitado para desarrollo (`CORS_ALLOW_ALL_ORIGINS = True`)
- CSRF deshabilitado (se usa JWT en su lugar)
- Permiso por defecto: `AllowAny` (los endpoints protegidos usan `EsAdministrador` o `IsAuthenticated`)

---

## Configuración del entorno

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Linux/Mac
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```


