'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import apiClient from '../../services/apiClient'
import { useAuthStore } from '../../store/authStore'
import VerifiedBadge from '../../components/ui/VerifiedBadge'

interface PendingCompany {
  userId: string
  companyName: string
  gstNumber: string
  phoneNumber?: string
  gstCertificateUrl?: string
}

interface DashboardStats {
  totalUsers: number
  totalPosts: number
  completedEscrows: number
  pendingGst: number
}

export default function AdminPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [pending, setPending] = useState<PendingCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { router.replace('/login'); return }
    if (!user.isAdmin && user.role !== 'ADMIN') { router.replace('/'); return }
    loadAll()
  }, [user])

  async function loadAll() {
    setLoading(true)
    try {
      const [statsRes, pendingRes] = await Promise.all([
        apiClient.get('/api/admin/dashboard'),
        apiClient.get('/api/admin/gst/pending'),
      ])
      setStats(statsRes.data?.data ?? statsRes.data)
      setPending(pendingRes.data?.data ?? pendingRes.data ?? [])
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(userId: string) {
    setApprovingId(userId)
    try {
      await apiClient.post(`/api/admin/gst/${userId}/approve`)
      toast.success('Company verified! Blue tick granted.')
      setPending(prev => prev.filter(c => c.userId !== userId))
      if (stats) setStats(s => s ? { ...s, pendingGst: s.pendingGst - 1 } : s)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to approve')
    } finally {
      setApprovingId(null)
    }
  }

  async function handleRevoke(userId: string) {
    if (!confirm('Revoke verification for this user?')) return
    try {
      await apiClient.post(`/api/admin/users/${userId}/revoke`)
      toast.success('Verification revoked.')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to revoke')
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
        <p style={{ color: '#64748b', fontWeight: 600 }}>Loading admin panel…</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '32px 16px 80px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>Admin Dashboard</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Manage verifications and platform stats</p>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
            {[
              { label: 'Total Users', value: stats.totalUsers, color: '#1565C0' },
              { label: 'Total Posts', value: stats.totalPosts, color: '#0891b2' },
              { label: 'Completed Tasks', value: stats.completedEscrows, color: '#16a34a' },
              { label: 'Pending GST', value: stats.pendingGst, color: '#d97706' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
                <p style={{ fontSize: 28, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Pending GST Approvals */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1b1c1a', marginBottom: 16 }}>
            Pending GST Verifications
            {pending.length > 0 && (
              <span style={{ marginLeft: 8, background: '#fef3c7', color: '#92400e', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
                {pending.length}
              </span>
            )}
          </h2>

          {pending.length === 0 ? (
            <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '24px 0' }}>
              No pending GST verifications.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pending.map(c => (
                <div
                  key={c.userId}
                  style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#1b1c1a', marginBottom: 4 }}>{c.companyName}</p>
                    <p style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>GST: <span style={{ fontWeight: 600, color: '#1565C0' }}>{c.gstNumber}</span></p>
                    {c.phoneNumber && (
                      <p style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Phone: <span style={{ fontWeight: 600, color: '#374151' }}>{c.phoneNumber}</span></p>
                    )}
                    {c.gstCertificateUrl && (
                      <a href={c.gstCertificateUrl} target="_blank" rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#1565C0', fontWeight: 600, textDecoration: 'none', marginTop: 2 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                        View Certificate
                      </a>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleApprove(c.userId)}
                      disabled={approvingId === c.userId}
                      style={{
                        padding: '8px 16px', borderRadius: 8, background: 'linear-gradient(135deg,#1565C0,#1976D2)',
                        color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                        opacity: approvingId === c.userId ? 0.6 : 1,
                      }}
                    >
                      {approvingId === c.userId ? 'Approving…' : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <VerifiedBadge size="sm" />
                          Approve
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => handleRevoke(c.userId)}
                      style={{ padding: '8px 14px', borderRadius: 8, background: '#fee2e2', color: '#dc2626', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
