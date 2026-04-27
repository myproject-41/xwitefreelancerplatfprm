import axios from 'axios'
import Cookies from 'js-cookie'

const TOKEN_KEY = 'xwite_token'
const AUTH_STORE_KEY = 'xwite-auth'

function clearAuthState() {
  if (typeof window === 'undefined') return

  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(AUTH_STORE_KEY)
  Cookies.remove(TOKEN_KEY)
}

// Production: empty baseURL so Next.js rewrites proxy all /api/* calls to Railway server-side
// (eliminates browser CORS regardless of what env vars Vercel dashboard has set)
// Development: use configured URL or fall back to localhost:4000
const baseURL =
  process.env.NODE_ENV === 'production'
    ? ''
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// Attach token to every request
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(TOKEN_KEY) || Cookies.get(TOKEN_KEY)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Handle 401 globally — skip auth endpoints since they intentionally return 401 for wrong credentials
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error.config?.url ?? ''
    const isAuthEndpoint = /\/api\/auth\/(login|register)/.test(url)

    if (error.response?.status === 401 && !isAuthEndpoint) {
      if (typeof window !== 'undefined') {
        clearAuthState()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
