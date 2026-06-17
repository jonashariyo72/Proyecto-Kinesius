from rest_framework.routers import DefaultRouter
from .views import QuejaViewSet

router = DefaultRouter()

router.register(
    r'quejas',
    QuejaViewSet,
    basename='quejas'
)

urlpatterns = router.urls