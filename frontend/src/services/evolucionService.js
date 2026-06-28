//import api from './clasesService'

// export const buscarPaciente = (dni) => {

//     return axios.get(
//         "/evolucion/buscar-paciente/",
//         {
//             params: {
//                 dni
//             }
//         }
//     )

// }
import api from './clasesService'

export const buscarPaciente = (dni) => {
    return api.get('/evolucion/buscar-paciente/', {
        params: { dni }
    })
}

export const registrarFicha = (datos) => {
    return api.post('/evolucion/registrar/', datos)
}

export const obtenerMisFichas = () => {

    return api.get(
        "/evolucion/mis-fichas/"
    )

}

export const obtenerFichasPaciente = (dni) => {

    return api.get(
        `/evolucion/fichas-paciente/?dni=${dni}`
    )

}