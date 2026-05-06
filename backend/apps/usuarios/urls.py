from django.urls import path
from .views import (
    RegistroClienteView,
    RegistroKinesiologoView,
    LoginView,
    Verificacion2FAView,
)

urlpatterns = [
    path('registro/cliente/',     RegistroClienteView.as_view(),     name='registro-cliente'),
    path('registro/kinesiologo/', RegistroKinesiologoView.as_view(), name='registro-kinesiologo'),
    path('login/',                LoginView.as_view(),                name='login'),
    path('verificar-2fa/',        Verificacion2FAView.as_view(),      name='verificar-2fa'),
]