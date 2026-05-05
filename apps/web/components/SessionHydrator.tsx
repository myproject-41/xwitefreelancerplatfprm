'use client'

import { useEffect } from 'react'
import { authService } from '../services/auth.service'
import { useAuthStore } from '../store/authStore'

export default function SessionHydrator() {
  const setUser = useAuthStore((s) => s.setUser)
  const setToken = useAuthStore((s) => s.setToken)

  useEffect(() => {
    const token = authService.getToken()
    if (!token) return

    authService.getMe()
      .then((data) => {
        if (data.user) setUser(data.user)
        if (data.token) setToken(data.token)
      })
      .catch(() => {
        // Token invalid — clearAuthState already removed it via 401 interceptor
      })
  }, [])

  return null
}
