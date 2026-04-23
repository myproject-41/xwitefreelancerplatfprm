import apiClient from './apiClient'
import Cookies from 'js-cookie'

const TOKEN_KEY = 'xwite_token'

export const authService = {
  async register(data: {
    email: string
    password: string
    role: 'FREELANCER' | 'COMPANY' | 'CLIENT'
  }) {
    const res = await apiClient.post('/api/auth/register', data)
    return res.data
  },

  async login(data: { email: string; password: string }) {
    const res = await apiClient.post('/api/auth/login', data)
    return res.data
  },

  async getMe() {
    const res = await apiClient.get('/api/auth/me')
    if (res.data.token) {
      authService.saveToken(res.data.token)
    }
    return res.data
  },

  saveToken(token: string) {
    if (typeof window === 'undefined') return

    // Save in both cookie (for middleware) and localStorage (for API calls)
    localStorage.setItem(TOKEN_KEY, token)
    Cookies.set(TOKEN_KEY, token, {
      expires: 7,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  },

  getToken() {
    if (typeof window === 'undefined') return Cookies.get(TOKEN_KEY)
    return localStorage.getItem(TOKEN_KEY) || Cookies.get(TOKEN_KEY)
  },

  removeToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem('xwite-auth')
    }
    Cookies.remove(TOKEN_KEY)
  },

  isLoggedIn() {
    if (typeof window === 'undefined') return false
    return !!localStorage.getItem(TOKEN_KEY) || !!Cookies.get(TOKEN_KEY)
  },
}
