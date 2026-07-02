from django.urls import path
from .views import EstadisticasMesesView

urlpatterns = [
    path("meses/", EstadisticasMesesView.as_view()),
]