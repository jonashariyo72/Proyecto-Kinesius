import axios from './axiosInstance'

export const buscarPaciente = (dni) => {

    return axios.post(
        '/evolucion/buscar-paciente/',
        {
            dni
        }
    )

}

export const registrarFicha = (datos) => {

    return axios.post(
        '/evolucion/registrar/',
        datos
    )

}