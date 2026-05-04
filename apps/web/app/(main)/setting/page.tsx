'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../../store/authStore'
import { authService } from '../../../services/auth.service'
import apiClient from '../../../services/apiClient'
import MainHeader from '../../../components/ui/MainHeader'

type Page = 'menu' | 'security' | 'data-privacy' | 'privacy-policy' | 'accessibility' | 'user-agreement'

function ChevronRight({ active = false }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`h-4 w-4 ${active ? 'text-[#1565C0]' : 'text-[#9ca3af]'}`}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function BackArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function StaticCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
      <p className="mb-2.5 text-sm font-extrabold text-[#1b1c1a]">{title}</p>
      <div className="text-sm leading-relaxed text-[#374151]">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [page, setPage] = useState<Page>('menu')

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [showPwForm, setShowPwForm] = useState(false)

  const [deletePassword, setDeletePassword] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleLogout = () => {
    logout()
    authService.removeToken()
    toast.success('Logged out successfully')
    router.push('/login')
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match')
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters')
    setPwLoading(true)
    try {
      await apiClient.put('/api/auth/change-password', { oldPassword, newPassword })
      toast.success('Password changed successfully!')
      setOldPassword(''); setNewPassword(''); setConfirmPassword('')
      setShowPwForm(false)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password')
    } finally {
      setPwLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!deletePassword) return toast.error('Enter your password to confirm')
    setDeleteLoading(true)
    try {
      await apiClient.delete('/api/auth/delete-account', { data: { password: deletePassword } })
      logout()
      authService.removeToken()
      toast.success('Account deleted')
      router.push('/')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete account')
    } finally {
      setDeleteLoading(false)
    }
  }

  const pageTitles: Record<Page, string> = {
    menu: 'Settings',
    security: 'Sign & Security',
    'data-privacy': 'Data Privacy',
    'privacy-policy': 'Privacy Policy',
    accessibility: 'Accessibility',
    'user-agreement': 'User Agreement',
  }

  const MENU_SECTIONS = [
    {
      title: 'Account',
      items: [
        { id: 'security' as Page, label: 'Sign & Security', icon: '🔐', desc: 'Email, password, account deletion' },
      ],
    },
    {
      title: 'Legal & Privacy',
      items: [
        { id: 'data-privacy' as Page, label: 'Data Privacy', icon: '🛡️', desc: 'How we handle your data' },
        { id: 'privacy-policy' as Page, label: 'Privacy Policy', icon: '📄', desc: 'Xwite privacy policy' },
        { id: 'user-agreement' as Page, label: 'User Agreement', icon: '📋', desc: 'Terms of use' },
      ],
    },
    {
      title: 'More',
      items: [
        { id: 'accessibility' as Page, label: 'Accessibility', icon: '♿', desc: 'Accessibility features' },
      ],
    },
  ]

  const navigateTo = (p: Page) => {
    setPage(p)
    setShowPwForm(false)
    setShowDeleteConfirm(false)
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9]">
      <MainHeader />
      <div className="mx-auto max-w-5xl px-4 pb-28 pt-20 lg:px-8">
        <div className="lg:grid lg:grid-cols-[300px_1fr] lg:items-start lg:gap-6">

          {/* ── LEFT SIDEBAR ── */}
          <div className={page !== 'menu' ? 'hidden lg:block' : 'block'}>
            <div className="space-y-5">
              <h1 className="text-2xl font-extrabold text-[#1b1c1a]">Settings</h1>

              <div className="flex items-center gap-4 rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#e8f4fd] text-xl font-extrabold text-[#1565C0]">
                  {user?.email?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-[#1b1c1a]">{user?.email}</p>
                  <span className="mt-0.5 inline-block rounded-full bg-[#e8f4fd] px-2.5 py-0.5 text-[11px] font-bold text-[#1976D2]">
                    {user?.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-bold text-red-600 transition hover:bg-red-100"
                >
                  Logout
                </button>
              </div>

              {MENU_SECTIONS.map(section => (
                <div key={section.title}>
                  <p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-widest text-[#94a3b8]">
                    {section.title}
                  </p>
                  <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
                    {section.items.map((item, i) => {
                      const isActive = page === item.id
                      return (
                        <button
                          key={item.id}
                          onClick={() => navigateTo(item.id)}
                          className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:scale-[0.99] ${
                            i > 0 ? 'border-t border-[#f1f5f9]' : ''
                          } ${isActive ? 'bg-[#E3F2FD]' : 'hover:bg-[#f8fafc]'}`}
                        >
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg ${
                            isActive ? 'bg-[#BBDEFB]' : 'bg-[#f1f5f9]'
                          }`}>
                            {item.icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-bold ${isActive ? 'text-[#1565C0]' : 'text-[#1b1c1a]'}`}>
                              {item.label}
                            </p>
                            <p className="text-[11px] text-[#6b7280]">{item.desc}</p>
                          </div>
                          <ChevronRight active={isActive} />
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT CONTENT ── */}
          <div className={page === 'menu' ? 'hidden lg:block' : 'block'}>

            {/* Desktop default when no page selected */}
            {page === 'menu' && (
              <div className="rounded-2xl border border-[#e2e8f0] bg-white p-10 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E3F2FD] text-3xl">⚙️</div>
                <p className="font-extrabold text-[#1b1c1a]">Select a setting</p>
                <p className="mt-1 text-sm text-[#6b7280]">Choose an option from the left panel to get started.</p>
              </div>
            )}

            {/* Mobile back button + title */}
            {page !== 'menu' && (
              <div className="mb-5 flex items-center gap-3">
                <button
                  onClick={() => navigateTo('menu')}
                  className="flex items-center gap-1.5 rounded-full border border-[#d6dce3] bg-white px-3 py-1.5 text-sm font-bold text-[#1565C0] transition hover:bg-[#f4f8fb] lg:hidden"
                >
                  <BackArrow />
                  Back
                </button>
                <h2 className="text-xl font-extrabold text-[#1b1c1a]">{pageTitles[page]}</h2>
              </div>
            )}

            {/* ── SIGN & SECURITY ── */}
            {page === 'security' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Email Address</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#1b1c1a]">{user?.email}</p>
                      <p className="mt-0.5 text-xs text-[#6b7280]">Your account email — cannot be changed</p>
                    </div>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8f4fd] text-sm">✉️</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="mb-0.5 text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Password</p>
                      <p className="font-bold text-[#1b1c1a]">••••••••</p>
                      <p className="mt-0.5 text-xs text-[#6b7280]">Keep your account secure with a strong password</p>
                    </div>
                    <button
                      onClick={() => setShowPwForm(v => !v)}
                      className="shrink-0 rounded-xl bg-[#1565C0] px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
                    >
                      {showPwForm ? 'Cancel' : 'Change'}
                    </button>
                  </div>
                  {showPwForm && (
                    <form onSubmit={handleChangePassword} className="mt-5 space-y-3 border-t border-[#f1f5f9] pt-4">
                      <div>
                        <label className="text-xs font-bold text-[#374151]">Current Password</label>
                        <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3 text-sm outline-none focus:ring-2 focus:ring-[#1565C0]/30"
                          placeholder="Your current password" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-[#374151]">New Password</label>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3 text-sm outline-none focus:ring-2 focus:ring-[#1565C0]/30"
                          placeholder="Min 8 characters" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-[#374151]">Confirm New Password</label>
                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3 text-sm outline-none focus:ring-2 focus:ring-[#1565C0]/30"
                          placeholder="Repeat new password" />
                      </div>
                      <button type="submit" disabled={pwLoading}
                        className="w-full rounded-xl bg-[linear-gradient(135deg,#1565C0,#1976D2)] py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60">
                        {pwLoading ? 'Changing…' : 'Change Password'}
                      </button>
                    </form>
                  )}
                </div>

                <div className="rounded-2xl border-2 border-red-100 bg-white p-5 shadow-sm">
                  <p className="mb-1 text-xs font-bold uppercase tracking-widest text-red-400">Danger Zone</p>
                  <p className="font-bold text-[#1b1c1a]">Delete Account</p>
                  <p className="mt-1 text-xs text-[#6b7280]">
                    Permanently deletes your account, profile, posts, and all data.{' '}
                    <span className="font-bold text-red-500">This cannot be undone.</span>
                  </p>
                  {!showDeleteConfirm ? (
                    <button onClick={() => setShowDeleteConfirm(true)}
                      className="mt-4 w-full rounded-xl border-2 border-red-300 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50">
                      Delete My Account
                    </button>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <div className="rounded-xl bg-red-50 p-3">
                        <p className="text-sm font-bold text-red-700">Are you absolutely sure? This cannot be reversed.</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-[#374151]">Enter your password to confirm</label>
                        <input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)}
                          className="mt-1 w-full rounded-xl border-2 border-red-200 bg-[#fff5f5] p-3 text-sm outline-none focus:ring-2 focus:ring-red-300"
                          placeholder="Your password" />
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => { setShowDeleteConfirm(false); setDeletePassword('') }}
                          className="flex-1 rounded-xl border border-[#e2e8f0] py-2.5 text-sm font-bold text-[#374151] hover:bg-[#f8fafc]">
                          Cancel
                        </button>
                        <button onClick={handleDeleteAccount} disabled={deleteLoading}
                          className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60">
                          {deleteLoading ? 'Deleting…' : 'Yes, Delete'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── DATA PRIVACY ── */}
            {page === 'data-privacy' && (
              <div className="space-y-4">
                <StaticCard title="What data we collect">
                  <p>We collect information you provide directly — such as your name, email, profile details, posts, and messages — as well as usage data to improve the platform.</p>
                </StaticCard>
                <StaticCard title="How we use your data">
                  <ul className="list-disc space-y-1.5 pl-4">
                    <li>To operate and improve the Xwite platform</li>
                    <li>To match freelancers with clients</li>
                    <li>To send important service notifications</li>
                    <li>To prevent fraud and ensure safety</li>
                  </ul>
                </StaticCard>
                <StaticCard title="Data sharing">
                  <p>We do not sell your personal data. We may share data with service providers who help us operate Xwite, always under strict confidentiality agreements.</p>
                </StaticCard>
                <StaticCard title="Your rights">
                  <ul className="list-disc space-y-1.5 pl-4">
                    <li>Access and download your data</li>
                    <li>Request correction of inaccurate data</li>
                    <li>Delete your account and associated data</li>
                    <li>Withdraw consent at any time</li>
                  </ul>
                </StaticCard>
                <StaticCard title="Contact">
                  <p>For data-related requests, contact us at <span className="font-semibold text-[#1565C0]">privacy@xwite.com</span></p>
                </StaticCard>
              </div>
            )}

            {/* ── PRIVACY POLICY ── */}
            {page === 'privacy-policy' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#e2e8f0] bg-[#e8f4fd] p-4">
                  <p className="text-xs font-bold text-[#1976D2]">Last updated: May 2026</p>
                  <p className="mt-1 text-sm font-bold text-[#1565C0]">Xwite Privacy Policy</p>
                </div>
                <StaticCard title="1. Introduction">
                  <p>Welcome to Xwite. We respect your privacy and are committed to protecting your personal data. This policy explains how Xwite ("we", "us", "our") collects, uses, and safeguards your information when you use our platform.</p>
                </StaticCard>
                <StaticCard title="2. Information We Collect">
                  <ul className="list-disc space-y-1.5 pl-4">
                    <li><span className="font-semibold">Account data:</span> name, email, role, profile details</li>
                    <li><span className="font-semibold">Content:</span> posts, proposals, messages, reviews</li>
                    <li><span className="font-semibold">Usage data:</span> pages visited, features used, device info</li>
                    <li><span className="font-semibold">Transaction data:</span> escrow and payment records</li>
                  </ul>
                </StaticCard>
                <StaticCard title="3. How We Use Information">
                  <ul className="list-disc space-y-1.5 pl-4">
                    <li>Provide and personalize the Xwite service</li>
                    <li>Process payments and manage escrow</li>
                    <li>Send transactional and service emails</li>
                    <li>Improve platform safety and prevent abuse</li>
                    <li>Comply with legal obligations</li>
                  </ul>
                </StaticCard>
                <StaticCard title="4. Data Retention">
                  <p>We retain your data for as long as your account is active. Upon account deletion, personal data is removed within 30 days except where retention is required by law.</p>
                </StaticCard>
                <StaticCard title="5. Security">
                  <p>We use industry-standard encryption and security practices to protect your data. However, no internet transmission is 100% secure and we cannot guarantee absolute security.</p>
                </StaticCard>
                <StaticCard title="6. Cookies">
                  <p>We use essential cookies for authentication and session management. We do not use third-party advertising cookies.</p>
                </StaticCard>
                <StaticCard title="7. Your Rights">
                  <p>Depending on your location, you may have rights including access, correction, deletion, and portability of your data. Contact us at <span className="font-semibold text-[#1565C0]">privacy@xwite.com</span> to exercise these rights.</p>
                </StaticCard>
                <StaticCard title="8. Changes to This Policy">
                  <p>We may update this policy from time to time. We will notify you of significant changes via email or an in-app notice.</p>
                </StaticCard>
                <StaticCard title="9. Contact Us">
                  <p>Xwite Inc. · <span className="font-semibold text-[#1565C0]">legal@xwite.com</span></p>
                </StaticCard>
              </div>
            )}

            {/* ── ACCESSIBILITY ── */}
            {page === 'accessibility' && (
              <div className="space-y-4">
                <StaticCard title="Our Commitment">
                  <p>Xwite is committed to making our platform accessible to everyone, including people with disabilities. We follow WCAG 2.1 guidelines and continuously work to improve the experience.</p>
                </StaticCard>
                <StaticCard title="Features">
                  <ul className="list-disc space-y-1.5 pl-4">
                    <li>High-contrast color schemes for readability</li>
                    <li>Screen reader compatible markup and ARIA labels</li>
                    <li>Keyboard navigation support across the platform</li>
                    <li>Scalable text — respects your device font size settings</li>
                    <li>Focus indicators on interactive elements</li>
                  </ul>
                </StaticCard>
                <StaticCard title="Tips for a Better Experience">
                  <ul className="list-disc space-y-1.5 pl-4">
                    <li>Use your browser{"'"}s built-in zoom (Ctrl/Cmd + scroll)</li>
                    <li>Enable dark mode in your device settings</li>
                    <li>Use a screen reader like VoiceOver or TalkBack</li>
                  </ul>
                </StaticCard>
                <StaticCard title="Feedback">
                  <p>If you encounter any accessibility barriers on Xwite, please let us know at <span className="font-semibold text-[#1565C0]">accessibility@xwite.com</span>. We aim to respond within 2 business days.</p>
                </StaticCard>
              </div>
            )}

            {/* ── USER AGREEMENT ── */}
            {page === 'user-agreement' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#e2e8f0] bg-[#e8f4fd] p-4">
                  <p className="text-xs font-bold text-[#1976D2]">Effective: May 2026</p>
                  <p className="mt-1 text-sm font-bold text-[#1565C0]">Xwite User Agreement</p>
                </div>
                <StaticCard title="1. Acceptance">
                  <p>By creating an account on Xwite, you agree to be bound by this User Agreement and our Privacy Policy. If you do not agree, do not use the platform.</p>
                </StaticCard>
                <StaticCard title="2. Eligibility">
                  <p>You must be at least 18 years old and capable of entering a legally binding agreement to use Xwite. Accounts must not be shared or transferred.</p>
                </StaticCard>
                <StaticCard title="3. Your Account">
                  <ul className="list-disc space-y-1.5 pl-4">
                    <li>You are responsible for keeping your credentials secure</li>
                    <li>You must provide accurate, up-to-date profile information</li>
                    <li>One account per person — no duplicate accounts</li>
                  </ul>
                </StaticCard>
                <StaticCard title="4. Acceptable Use">
                  <p>You agree not to:</p>
                  <ul className="mt-1.5 list-disc space-y-1.5 pl-4">
                    <li>Post false, misleading, or fraudulent content</li>
                    <li>Harass, threaten, or abuse other users</li>
                    <li>Attempt to reverse-engineer or scrape the platform</li>
                    <li>Use the platform for illegal activities</li>
                  </ul>
                </StaticCard>
                <StaticCard title="5. Payments & Escrow">
                  <p>All payments are processed through Xwite{"'"}s escrow system. Funds are held securely and released only when work is accepted. Xwite charges a platform fee on completed transactions.</p>
                </StaticCard>
                <StaticCard title="6. Intellectual Property">
                  <p>You retain ownership of content you post. By posting on Xwite, you grant us a limited licence to display and distribute that content within the platform.</p>
                </StaticCard>
                <StaticCard title="7. Termination">
                  <p>We may suspend or terminate accounts that violate this agreement. You may delete your account at any time from Settings → Sign & Security.</p>
                </StaticCard>
                <StaticCard title="8. Limitation of Liability">
                  <p>Xwite is not liable for indirect, incidental, or consequential damages arising from your use of the platform. Our total liability is limited to amounts paid to us in the 12 months preceding a claim.</p>
                </StaticCard>
                <StaticCard title="9. Governing Law">
                  <p>This agreement is governed by the laws of India. Disputes shall be resolved by arbitration in accordance with applicable rules.</p>
                </StaticCard>
                <StaticCard title="10. Contact">
                  <p><span className="font-semibold text-[#1565C0]">legal@xwite.com</span></p>
                </StaticCard>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
