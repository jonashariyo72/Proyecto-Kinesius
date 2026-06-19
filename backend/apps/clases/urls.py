from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClaseViewSet, GenerarQRClaseView, AsistenciaQRView, AsistenciaManualView, MisClasesKinesiologoView

router = DefaultRouter()
router.register(r'', ClaseViewSet, basename='clase')

urlpatterns = [
    path('generar-qr/<int:clase_id>/',        GenerarQRClaseView.as_view(),       name='generar-qr'),
    path('asistencia/qr/<uuid:qr_token>/',    AsistenciaQRView.as_view(),         name='asistencia-qr'),
    path('asistencia/manual/<int:clase_id>/', AsistenciaManualView.as_view(),     name='asistencia-manual'),
    path('', include(router.urls)),
]

# Endpoints generados automáticamente por el router:
#
#   GET    /clases/              → Lista todas las clases       (HU#28, #29)
#   POST   /clases/              → Crea una clase               (HU#13)
#   GET    /clases/{id}/         → Detalle de una clase
#   PUT    /clases/{id}/         → Actualiza una clase          (HU#15)
#   PATCH  /clases/{id}/         → Actualización parcial        (HU#15)
#   DELETE /clases/{id}/         → Desactiva una clase          (HU#27)
#   GET    /clases/grilla/       → Grilla semanal de turnos     (HU#28)
#   GET    /clases/mis-clases/   → Turnos del kinesiólogo       (HU#32)
