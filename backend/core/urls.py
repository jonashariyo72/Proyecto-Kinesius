from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/usuarios/',       include('apps.usuarios.urls')),
    path('api/clases/',         include('apps.clases.urls')),
    path('api/reservas/',       include('apps.reservas.urls')),
    path('api/pagos/',          include('apps.pagos.urls')),
    path('api/notificaciones/', include('apps.notificaciones.urls')),

]