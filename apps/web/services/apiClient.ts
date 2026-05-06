import axios, { AxiosError, AxiosRequestConfig } from 'axios'
import Cookies from 'js-cookie'

const TOKEN_KEY = 'xwite_token'

// ─── Retry config for transient gateway errors ───────────────────────────────
// 502 / 503 / 504 are typically caused by upstream restart, cold start, or
// brief overload. Auto-retrying with backoff makes these invisible to users
// instead of forcing them to manually retry.
const MAX_RETRIES        = 3
const TRANSIENT_STATUSES = new Set([502, 503, 504])

type RetryableConfig = AxiosRequestConfig & { __retryCount?: number }

function clearAuthState() {
  if (typeof window === 'undefined') return

  localStorage.removeItem(TOKEN_KEY)
  Cookies.remove(TOKEN_KEY)
  // Do NOT remove AUTH_STORE_KEY — user profile data should survive token expiry
  // so the UI remains populated when the user re-authenticates
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
  timeout: 30_000,
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

function isTransientError(error: AxiosError): boolean {
  // No response → network error or timeout — generally retry-worthy
  if (!error.response) {
    return error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || error.code === 'ECONNRESET'
  }
  return TRANSIENT_STATUSES.has(error.response.status)
}

function nextBackoffMs(retryCount: number): number {
  // 1s, 2s, 4s with ±20% jitter to avoid thundering herd
  const base   = 1_000 * Math.pow(2, retryCount)
  const jitter = base * 0.2 * (Math.random() * 2 - 1)
  return Math.min(base + jitter, 5_000)
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined
    const url: string = config?.url ?? ''
    const isAuthEndpoint = /\/api\/auth\/(login|register)/.test(url)
    const status = error.response?.status

    // 1. Retry transient gateway errors (silent to user)
    if (config && isTransientError(error)) {
      const retryCount = config.__retryCount ?? 0
      if (retryCount < MAX_RETRIES) {
        config.__retryCount = retryCount + 1
        const delay = nextBackoffMs(retryCount)
        await new Promise((r) => setTimeout(r, delay))
        return apiClient(config)
      }
    }

    // 2. Auth-failure cleanup (skip auth endpoints — they 401 on wrong creds)
    if (status === 401 && !isAuthEndpoint) {
      if (typeof window !== 'undefined') {
        clearAuthState()
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
