import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage    from './pages/LoginPage'
import RegistroPage from './pages/RegistroPage'
import AdminPage    from './pages/AdminPage'
import KinesciusHome from './pages/KinesciusHome'
import ResetPasswordPage from './pages/ResetPasswordPage'
import AsistenciaQRPage from './pages/AsistenciaQRPage'
import ClientePage from './pages/ClientePage'
import CambiarPasswordPage from './pages/CambiarPasswordPage'
import RecuperarPasswordPage from './pages/RecuperarPasswordPage'
import ListaEsperaConfirmarPage from './pages/ListaEsperaConfirmarPage'
import ListaEsperaCancelarPage from './pages/ListaEsperaCancelarPage'
import ResponderListaEsperaPage from './pages/ResponderListaEsperaPage'
import PagoListaEsperaPage from './pages/PagoListaEsperaPage'

import { PagoExitoso, PagoFallido, PagoPendiente } from './pages/PagoRetornoPages'
import KinesiologoPage from './pages/KinesiologoPage'

// Redirige según el rol al entrar a "/dashboard"
function RutaInicio() {
  const { autenticado, rol } = useAuth()
  if (!autenticado) return <Navigate to="/login" replace />
  if (rol === 'administrador') return <Navigate to="/admin" replace />
  if (rol === 'kinesiologo')   return <Navigate to="/kinesiologo" replace />
  if (rol === 'cliente')       return <Navigate to="/cliente" replace />
  return <Navigate to="/login" replace />
}

// Protege rutas: si no está autenticado manda al login
function RutaProtegida({ rolRequerido, children }) {
  const { autenticado, rol } = useAuth()
  if (!autenticado) return <Navigate to="/login" replace />
  if (rolRequerido && rol !== rolRequerido) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Página principal pública */}
          <Route path="/"        element={<KinesciusHome />} />

          {/* Redirige al panel según rol una vez autenticado */}
          <Route path="/dashboard" element={<RutaInicio />} />

          <Route path="/login"    element={<LoginPage />} />
          <Route path="/registro" element={<RegistroPage />} />

          <Route path="/admin" element={
            <RutaProtegida rolRequerido="administrador">
              <AdminPage />
            </RutaProtegida>
          } />

         <Route path="/kinesiologo" element={
            <RutaProtegida rolRequerido="kinesiologo">
              <KinesiologoPage />
            </RutaProtegida>
          } />

          <Route path="/cliente" element={
            <RutaProtegida rolRequerido="cliente">
              <ClientePage />
            </RutaProtegida>
          } />

          <Route path="/cambiar-password" element={
            <RutaProtegida rolRequerido="cliente">
              <CambiarPasswordPage />
            </RutaProtegida>
          }/>

          <Route path="/reset-password" element={<ResetPasswordPage />}/>

          <Route path="/recuperar-password" element={<RecuperarPasswordPage />} />

          <Route path="/pago-exitoso"   element={<PagoExitoso />} />
          <Route path="/pago-fallido"   element={<PagoFallido />} />
          <Route path="/pago-pendiente" element={<PagoPendiente />} />

          <Route path="/lista-espera/confirmar/:id" element={<ListaEsperaConfirmarPage />}/>

          <Route path="/lista-espera/cancelar/:id" element={<ListaEsperaCancelarPage />}/>

          <Route path="/lista-espera/responder/:id" element={<ResponderListaEsperaPage />}/>

          <Route path="/lista-espera/pago/:id" element={<PagoListaEsperaPage />}/>

          <Route path="/asistencia/qr/:token" element={<AsistenciaQRPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}