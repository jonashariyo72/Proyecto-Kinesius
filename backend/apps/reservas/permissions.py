from rest_framework import permissions

class IsOwnerOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # El Admin siempre tiene permiso
        if request.user.is_staff:
            return True
        # El paciente solo puede ver/editar lo suyo
        return obj.paciente.user == request.user