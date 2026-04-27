'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '../../../services/auth.service'
import { useAuthStore } from '../../../store/authStore'

export default function LoginPage() {
  const router = useRouter()
  const { setUser, setToken } = useAuthStore()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.email || !form.password) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)
    try {
      const res = await authService.login(form)
      const { user, token } = res.data

      authService.saveToken(token)
      setToken(token)
      setUser(user)

      if (!user.isOnboarded) {
        router.push(`/onboarding/${user.role.toLowerCase()}`)
      } else {
        router.push('/')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#EDF1F7] px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0077b5] via-[#005d8f] to-[#0077b5] px-6 py-7 text-white shadow-[0_24px_60px_rgba(0,119,181,0.32)]">
          <h1 className="font-headline text-3xl font-extrabold tracking-tight">Welcome Back</h1>
          <p className="mt-2 text-sm font-medium text-white/75">Sign in to continue to Xwite</p>
        </div>

        <div className="rounded-[24px] border border-white/70 bg-white/90 p-6 shadow-[0_18px_44px_rgba(0,119,181,0.08)] backdrop-blur-xl">
          <div className="mb-5 flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Sign In</p>
            <span className="rounded-full bg-[#0077b5]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#005d8f]">
              Secure
            </span>
          </div>

          {/* Inline error banner — stays visible until user retypes */}
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-semibold text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setError(null) }}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#0D1B2A] outline-none transition focus:border-[#0077b5] focus:ring-2 focus:ring-[#e8f4fd]"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(null) }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-14 text-sm text-[#0D1B2A] outline-none transition focus:border-[#0077b5] focus:ring-2 focus:ring-[#e8f4fd]"
                  placeholder="Your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-wide text-slate-500 transition hover:text-[#0077b5]"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#0077b5] py-3.5 text-sm font-extrabold text-white shadow-[0_16px_34px_rgba(0,119,181,0.30)] transition hover:bg-[#005d8f] active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <a href="/signup" className="font-bold text-[#0077b5] hover:underline">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
