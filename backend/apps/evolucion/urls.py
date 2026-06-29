from django.urls import path


from .views import BuscarPacienteView, RegistrarFichaView, MisFichasView, FichasPacienteView

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
    path("mis-fichas/", MisFichasView.as_view()),
    path("fichas-paciente/", FichasPacienteView.as_view()),
]