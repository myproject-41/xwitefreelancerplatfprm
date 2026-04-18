import apiClient from './apiClient'
import Cookies from 'js-cookie'

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
    // Save in both cookie (for middleware) and localStorage (for API calls)
    localStorage.setItem('xwite_token', token)
    Cookies.set('xwite_token', token, {
      expires: 7,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  },

  getToken() {
    return localStorage.getItem('xwite_token') || Cookies.get('xwite_token')
  },

  removeToken() {
    localStorage.removeItem('xwite_token')
    Cookies.remove('xwite_token')
  },

  isLoggedIn() {
    if (typeof window === 'undefined') return false
    return !!localStorage.getItem('xwite_token') || !!Cookies.get('xwite_token')
  },
}