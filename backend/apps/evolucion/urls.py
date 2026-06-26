from django.urls import path


from .views import BuscarPacienteView, RegistrarFichaView

# urlpatterns = [
#     path(
#         "buscar-paciente/",
#         BuscarPacienteView.as_view(),
#         name="buscar-paciente"
#     ),

#     path(
#         "registrar/",
#         RegistrarFichaView.as_view(),
#         name="registrar-ficha"
#     ),
# ]

urlpatterns = [
    path("buscar-paciente/", BuscarPacienteView.as_view()),
    path("registrar/", RegistrarFichaView.as_view()),
]