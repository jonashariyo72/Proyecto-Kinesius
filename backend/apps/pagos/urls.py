from django.urls import path
from .views import (
    IniciarPagoView,
    ConfirmarPagoView,
    DetallePagoView,
    MisPagosView,
    PagosAdminView,
    SaldoFavorView,
    VerificarPagoMPView,
    ConfirmarPagoSaldoView,
)

urlpatterns = [
    path('iniciar/',      IniciarPagoView.as_view(),   name='iniciar-pago'),
    path('confirmar/',    ConfirmarPagoView.as_view(),  name='confirmar-pago'),
    path('mis-pagos/',    MisPagosView.as_view(),       name='mis-pagos'),
    path('admin/',        PagosAdminView.as_view(),     name='pagos-admin'),
    path('saldo-favor/',  SaldoFavorView.as_view(),     name='saldo-favor'),
    path('<int:pago_id>/', DetallePagoView.as_view(),   name='detalle-pago'),
    path('verificar-mp/', VerificarPagoMPView.as_view(), name='verificar-mp'),
    path('confirmar-saldo/', ConfirmarPagoSaldoView.as_view(), name='confirmar-saldo'),
]