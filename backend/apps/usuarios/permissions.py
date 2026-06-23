from rest_framework.permissions import BasePermission

class EsAdministrador(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'administrador')
        )
        
class EsAdminOKinesiologo(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (hasattr(request.user, 'administrador') or hasattr(request.user, 'kinesiologo'))
        )