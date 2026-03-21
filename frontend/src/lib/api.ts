import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    // Only attempt refresh if it's a 401, we haven't retried yet,
    // and the request isn't to the auth endpoints themselves (login/refresh)
    if (
      err.response?.status === 401 && 
      !original._retry && 
      !original.url?.includes('/auth/login') && 
      !original.url?.includes('/auth/refresh')
    ) {
      original._retry = true
      const rt = localStorage.getItem('refreshToken')
      if (!rt) {
        localStorage.clear()
        if (window.location.pathname !== '/login') window.location.href = '/login'
        return Promise.reject(err)
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken: rt,
        })
        localStorage.setItem('accessToken', data.accessToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        localStorage.clear()
        if (window.location.pathname !== '/login') window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)
