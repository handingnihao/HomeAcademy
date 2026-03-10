import axios from 'axios'

// TODO: This is your central API client.
// All backend calls should go through here.
// Add request/response interceptors for:
//   - Attaching the JWT token to every request
//   - Redirecting to /login on 401 responses
//   - Global error handling/toast notifications

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api'
})

api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('authToken')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => Promise.reject(error)
)

api.interceptors.response.use(
    (response) => response,
    (error) => {
      if(error.response?.status === 401) {
        localStorage.removeItem('authToken')
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }
)