    import { createContext, useContext, useState } from 'react'

    const PagoContext = createContext(null)

    export function PagoProvider({ children }) {
    // El pago activo durante el flujo de reserva
    const [pagoActivo, setPagoActivo] = useState(null)

    // Abre el flujo de pago para una reserva dada
    // reservaId y montoTotalClase vienen del módulo de reservas
    const abrirPago = (reservaId, montoTotalClase) => {
        setPagoActivo({ reservaId, montoTotalClase })
    }

    // Limpia el flujo al cerrar o al terminar
    const cerrarPago = () => {
        setPagoActivo(null)
    }

    return (
        <PagoContext.Provider value={{ pagoActivo, abrirPago, cerrarPago }}>
        {children}
        </PagoContext.Provider>
    )
    }

    export const usePago = () => useContext(PagoContext)