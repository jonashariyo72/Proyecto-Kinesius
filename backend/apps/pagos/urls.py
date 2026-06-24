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
    IniciarPagoCuotaView,
    ConfirmarPagoCuotaView,
    VerificarPagoCuotaMPView,
    PagarCuotaEfectivoView,
    ListaSaldosPendientesView,
    PagarRestoEfectivoView,
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

    # ── Pago de Cuota Mensual (Cliente No Abonado) ────────────────────────
    path('cuota/iniciar/',      IniciarPagoCuotaView.as_view(),     name='iniciar-cuota'),
    path('cuota/confirmar/',    ConfirmarPagoCuotaView.as_view(),   name='confirmar-cuota'),
    path('cuota/verificar-mp/', VerificarPagoCuotaMPView.as_view(), name='verificar-cuota-mp'),
    path('cuota/efectivo/',     PagarCuotaEfectivoView.as_view(),   name='pagar-cuota-efectivo'),

    # ── Registrar Pago en Efectivo del resto de una clase (Administrador) ─
    path('saldos-pendientes/<str:dni>/', ListaSaldosPendientesView.as_view(), name='saldos-pendientes'),
    path('registrar-efectivo/',          PagarRestoEfectivoView.as_view(),    name='registrar-efectivo'),
]