import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage    from './pages/LoginPage'
import RegistroPage from './pages/RegistroPage'
import AdminPage    from './pages/AdminPage'

import ClientePage from './pages/ClientePage'
import CambiarPasswordPage from './pages/CambiarPasswordPage'


import { PagoExitoso, PagoFallido, PagoPendiente } from './pages/PagoRetornoPages'


// Redirige según el rol al entrar a "/"
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
          <Route path="/"        element={<RutaInicio />} />
          <Route path="/login"   element={<LoginPage />} />
          <Route path="/registro" element={<RegistroPage />} />

          <Route path="/admin" element={
            <RutaProtegida rolRequerido="administrador">
              <AdminPage />
            </RutaProtegida>
          } />

          {/* Placeholder hasta que se creen esas páginas */}
          <Route path="/kinesiologo" element={
            <RutaProtegida rolRequerido="kinesiologo">
              <div style={{padding:'2rem'}}>Panel Kinesiólogo — próximamente</div>
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


<Route path="/pago-exitoso"   element={<PagoExitoso />} />
<Route path="/pago-fallido"   element={<PagoFallido />} />
<Route path="/pago-pendiente" element={<PagoPendiente />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}