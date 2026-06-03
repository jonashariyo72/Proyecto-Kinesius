from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReservaViewSet, ListaEsperaViewSet

router = DefaultRouter()
router.register(r'gestion', ReservaViewSet)
router.register(r'espera', ListaEsperaViewSet)

urlpatterns = [
    path('', include(router.urls)),
]