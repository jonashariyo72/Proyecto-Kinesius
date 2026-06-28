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