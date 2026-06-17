// import axios from 'axios'

// const api = axios.create({
//   baseURL: 'http://localhost:8000/api'
// })

// api.interceptors.request.use((config) => {
//   const token = sessionStorage.getItem('access')

//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`
//   }

//   return config
// })

// export const crearQueja = (descripcion) =>
//   api.post('/quejas/', {
//     descripcion
//   })

// export const obtenerQuejas = () =>
//   api.get('/quejas/')

import api from './clasesService'

export const crearQueja = (descripcion) => {
  return api.post('/quejas/', {
    descripcion
  })
}

export const obtenerQuejas = () => {
  return api.get('/quejas/')
}