from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReservaViewSet, ListaEsperaViewSet, HistorialCancelacionesView

router = DefaultRouter()
router.register(r'gestion', ReservaViewSet)
router.register(r'espera', ListaEsperaViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('historial-cancelaciones/', HistorialCancelacionesView.as_view(), name='historial-cancelaciones'),
]