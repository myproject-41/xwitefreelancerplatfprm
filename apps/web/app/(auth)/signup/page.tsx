'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { authService } from '../../../services/auth.service'
import { useAuthStore } from '../../../store/authStore'

type Role = 'FREELANCER' | 'COMPANY' | 'CLIENT'

const ROLES: { value: Role; icon: string; title: string; desc: string }[] = [
  {
    value: 'FREELANCER',
    icon: 'work',
    title: 'Freelancer',
    desc: 'Offer skills, bid on tasks, and get paid for your work.',
  },
  {
    value: 'COMPANY',
    icon: 'apartment',
    title: 'Company',
    desc: 'Hire talent, manage projects, and build your team.',
  },
  {
    value: 'CLIENT',
    icon: 'target',
    title: 'Client',
    desc: 'Post tasks and hire freelancers for focused work.',
  },
]

export default function SignupPage() {
  const router = useRouter()
  const { setUser, setToken } = useAuthStore()
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [form, setForm] = useState({ email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)

  const handleContinue = () => {
    if (!selectedRole) {
      toast.error('Please select a role')
      return
    }
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedRole) return toast.error('Please select a role')
    if (!form.email.trim()) return toast.error('Email is required')
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters')
    if (form.password !== form.confirm) return toast.error('Passwords do not match')

    const email = form.email.trim().toLowerCase()

    setLoading(true)
    try {
      const res = await authService.register({
        email,
        password: form.password,
        role: selectedRole,
      })

      if (res.data?.existingAccount) {
        try {
          const loginRes = await authService.login({
            email,
            password: form.password,
          })

          authService.saveToken(loginRes.data.token)
          setToken(loginRes.data.token)
          setUser(loginRes.data.user)
          toast.success('Account already exists. Signed you in.')

          if (!loginRes.data.user.isOnboarded) {
            router.push(`/onboarding/${loginRes.data.user.role.toLowerCase()}`)
          } else {
            router.push('/')
          }
          return
        } catch {
          toast.error('This email is already registered. Please log in with your existing password.')
          return
        }
      }

      authService.saveToken(res.data.token)
      setToken(res.data.token)
      setUser(res.data.user)
      toast.success('Account created!')
      router.push(`/onboarding/${selectedRole.toLowerCase()}`)
    } catch (error: any) {
      const message = error.response?.data?.message
      toast.error(message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#EDF1F7] px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0077b5] via-[#005d8f] to-[#0077b5] px-6 py-7 text-white shadow-[0_24px_60px_rgba(0,119,181,0.32)]">
          <h1 className="font-headline text-3xl font-extrabold tracking-tight">Xwite</h1>
          <p className="mt-2 text-sm font-medium text-white/75">Create your account</p>
        </div>

        <div className="rounded-[24px] border border-white/70 bg-white/90 p-6 shadow-[0_18px_44px_rgba(0,119,181,0.08)] backdrop-blur-xl">
          <p className="mb-5 text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
            {step === 1 ? 'Choose Role' : 'Account Details'}
          </p>

          {step === 1 && (
            <div>
              <div className="space-y-3">
                {ROLES.map((role) => {
                  const isSelected = selectedRole === role.value
                  return (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setSelectedRole(role.value)}
                      aria-pressed={isSelected}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                        isSelected
                          ? 'border-[#0077b5] bg-[#0077b5] text-white shadow-[0_14px_30px_rgba(0,119,181,0.28)]'
                          : 'border-slate-200 bg-white text-[#0D1B2A] hover:-translate-y-0.5 hover:border-[#0077b5]/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <p className="text-base font-black tracking-tight">{role.title}</p>
                          <p className={`mt-1 text-sm ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>{role.desc}</p>
                        </div>
                        <span
                          className={`mt-1 h-5 w-5 rounded-full border-2 ${
                            isSelected ? 'border-white bg-white' : 'border-slate-300'
                          }`}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={handleContinue}
                disabled={!selectedRole}
                className="mt-6 w-full rounded-xl bg-[#0077b5] py-3.5 text-sm font-extrabold text-white shadow-[0_16px_34px_rgba(0,119,181,0.30)] transition hover:bg-[#005d8f] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm font-semibold text-slate-500 transition hover:text-[#0077b5]"
              >
                Back
              </button>

              <div className="rounded-xl border border-[#0077b5]/20 bg-[#e8f4fd] p-3">
                <span className="text-sm font-bold text-[#005d8f]">
                  Joining as {ROLES.find((item) => item.value === selectedRole)?.title}
                </span>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#0D1B2A] outline-none transition focus:border-[#0077b5] focus:ring-2 focus:ring-[#e8f4fd]"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">Password</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#0D1B2A] outline-none transition focus:border-[#0077b5] focus:ring-2 focus:ring-[#e8f4fd]"
                  placeholder="Min 8 characters"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#0D1B2A] outline-none transition focus:border-[#0077b5] focus:ring-2 focus:ring-[#e8f4fd]"
                  placeholder="Repeat password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#0077b5] py-3.5 text-sm font-extrabold text-white shadow-[0_16px_34px_rgba(0,119,181,0.30)] transition hover:bg-[#005d8f] active:scale-95 disabled:opacity-60"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <a href="/login" className="font-bold text-[#0077b5] hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
