from django.urls import path
from .views import (
    RegistroClienteView,
    RegistroKinesiologoView,
    LoginView,
    Verificacion2FAView,
    ListaKinesiologosView,
    CambiarPasswordView,
    PerfilClienteView,
    RecuperarPasswordView,
    ListaClientesView,
    ResetPasswordPublicView,
)

urlpatterns = [
    path('registro/cliente/',     RegistroClienteView.as_view(),     name='registro-cliente'),
    path('registro/kinesiologo/', RegistroKinesiologoView.as_view(), name='registro-kinesiologo'),
    path('login/',                LoginView.as_view(),                name='login'),
    path('verificar-2fa/',        Verificacion2FAView.as_view(),      name='verificar-2fa'),
    path('kinesiologos/',         ListaKinesiologosView.as_view(),    name='kinesiologos'),
    path('cambiar-password/', CambiarPasswordView.as_view()),
    path('perfil/', PerfilClienteView.as_view(), name='perfil-cliente'),
    path('recuperar-password/', RecuperarPasswordView.as_view()),
    path('clientes/', ListaClientesView.as_view(), name='clientes'),
    path('reset-password/', ResetPasswordPublicView.as_view()),
]