'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { escrowService } from '@/services/escrow.service'
import { useAuthStore } from '@/store/authStore'

type EscrowStatus = 'CREATED' | 'FUNDED' | 'IN_PROGRESS' | 'REVIEW' | 'RELEASED' | 'DISPUTED' | 'REFUNDED'

interface EscrowItem {
  id: string
  status: EscrowStatus
  amount: number
  createdAt: string
  task: { id: string; title: string }
  client: {
    id: string
    clientProfile?:  { fullName?: string; profileImage?: string }
    companyProfile?: { companyName?: string; profileImage?: string }
  }
  freelancer: {
    id: string
    freelancerProfile?: { fullName?: string; profileImage?: string }
  }
}

const STATUS_COLORS: Record<EscrowStatus, { bg: string; text: string; label: string }> = {
  CREATED:     { bg: '#f1f5f9', text: '#475569', label: 'Awaiting Funding' },
  FUNDED:      { bg: '#dbeafe', text: '#1e40af', label: 'Funded'           },
  IN_PROGRESS: { bg: '#dbeafe', text: '#1e40af', label: 'In Progress'      },
  REVIEW:      { bg: '#fef9c3', text: '#854d0e', label: 'Under Review'     },
  RELEASED:    { bg: '#dcfce7', text: '#15803d', label: 'Released'         },
  DISPUTED:    { bg: '#fee2e2', text: '#991b1b', label: 'Disputed'         },
  REFUNDED:    { bg: '#f3f4f6', text: '#6b7280', label: 'Refunded'         },
}

function fmt(n: number) {
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n) }
  catch { return `₹${n}` }
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function getName(escrow: EscrowItem, myId?: string) {
  const isClient = escrow.client.id === myId
  if (isClient) {
    return escrow.freelancer.freelancerProfile?.fullName ?? 'Freelancer'
  }
  return (
    escrow.client.clientProfile?.fullName ??
    escrow.client.companyProfile?.companyName ??
    'Client'
  )
}

export default function EscrowListPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [escrows, setEscrows] = useState<EscrowItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    escrowService.getMyEscrows()
      .then(res => setEscrows(res?.data ?? res ?? []))
      .catch(() => setEscrows([]))
      .finally(() => setLoading(false))
  }, [])

  const active   = escrows.filter(e => !['RELEASED', 'REFUNDED'].includes(e.status))
  const finished = escrows.filter(e =>  ['RELEASED', 'REFUNDED'].includes(e.status))

  return (
    <main style={{ minHeight: '100vh', background: '#EDF1F7', fontFamily: "'Inter',sans-serif", padding: '28px 16px 80px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*,*::before,*::after{box-sizing:border-box;}`}</style>

      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0D1B2A', marginBottom: 4 }}>My Escrows</h1>
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>All your active and completed escrow contracts</p>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ background: 'linear-gradient(90deg,#e8eaed 25%,#f5f5f5 50%,#e8eaed 75%)', backgroundSize: '1200px 100%', animation: 'shimmer 1.4s ease infinite', height: 16, width: '45%', borderRadius: 6, marginBottom: 10 }} />
                <div style={{ background: 'linear-gradient(90deg,#e8eaed 25%,#f5f5f5 50%,#e8eaed 75%)', backgroundSize: '1200px 100%', animation: 'shimmer 1.4s ease infinite', height: 12, width: '65%', borderRadius: 6 }} />
              </div>
            ))}
          </div>
        ) : escrows.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: 48, textAlign: 'center', boxShadow: '0 2px 20px rgba(0,0,0,0.08)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="#e2e8f0" style={{ marginBottom: 12 }}><path d="M11 17h2v-1h1c.55 0 1-.45 1-1v-3c0-.55-.45-1-1-1h-3v-1h4V8h-2V7h-2v1h-1c-.55 0-1 .45-1 1v3c0 .55.45 1 1 1h3v1H9v2h2v1zm9-13H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4V6h16v12z"/></svg>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0D1B2A' }}>No escrows yet</p>
            <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>Escrows are created automatically when a proposal is accepted.</p>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section style={{ marginBottom: 28 }}>
                <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: '#94a3b8', marginBottom: 12 }}>Active ({active.length})</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {active.map(e => <EscrowCard key={e.id} escrow={e} myId={user?.id} onClick={() => router.push(`/payment/escrow/${e.id}`)} />)}
                </div>
              </section>
            )}
            {finished.length > 0 && (
              <section>
                <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: '#94a3b8', marginBottom: 12 }}>Completed ({finished.length})</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {finished.map(e => <EscrowCard key={e.id} escrow={e} myId={user?.id} onClick={() => router.push(`/payment/escrow/${e.id}`)} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  )
}

function EscrowCard({ escrow, myId, onClick }: { escrow: EscrowItem; myId?: string; onClick: () => void }) {
  const col = STATUS_COLORS[escrow.status]
  const other = getName(escrow, myId)
  const isClient = escrow.client.id === myId

  return (
    <div
      onClick={onClick}
      style={{ background: '#fff', borderRadius: 16, padding: '16px 20px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, transition: 'box-shadow .15s' }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,119,181,0.13)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 8px rgba(0,0,0,0.06)')}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 700, fontSize: 15, color: '#0D1B2A', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {escrow.task.title}
        </p>
        <p style={{ fontSize: 12, color: '#64748b' }}>
          {isClient ? 'Freelancer' : 'Client'}: <strong>{other}</strong> · {fmtDate(escrow.createdAt)}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: '#0D1B2A' }}>{fmt(escrow.amount)}</span>
        <span style={{ ...col, padding: '4px 11px', borderRadius: 999, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em' }}>{col.label}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#94a3b8"><path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
      </div>
    </div>
  )
}
