'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { postService } from '@/services/post.service'

/* ══════════════════════════════════════
   TYPES
══════════════════════════════════════ */
type ProposalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN'
type PostType = 'JOB' | 'TASK' | 'COLLAB' | 'SKILL_EXCHANGE'

interface ClientInfo {
  id: string
  companyProfile?: { companyName?: string; profileImage?: string }
  clientProfile?:  { fullName?: string; profileImage?: string }
}
interface TaskInfo  { id: string; escrow?: { id: string; status: string } | null }
interface PostInfo  { id: string; title: string; budget?: number; type: PostType; status: string; client: ClientInfo; tasks: TaskInfo[] }
interface MyProposal { id: string; postId: string; status: ProposalStatus; coverLetter: string; proposedRate?: number; createdAt: string; post: PostInfo }

/* ══════════════════════════════════════
   STYLES
══════════════════════════════════════ */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
@keyframes mp-shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}
@keyframes mp-spin{to{transform:rotate(360deg);}}
.mp-skel{background:linear-gradient(90deg,#e8eaed 25%,#f5f5f5 50%,#e8eaed 75%);background-size:1200px 100%;animation:mp-shimmer 1.4s ease infinite;border-radius:8px;}

.mp-page{min-height:100vh;background:#EDF1F7;font-family:'Inter',sans-serif;padding:28px 16px 80px;}
.mp-wrap{max-width:860px;margin:0 auto;}
.mp-heading{font-size:24px;font-weight:800;color:#0D1B2A;letter-spacing:-0.02em;}
.mp-sub{font-size:14px;color:#64748b;margin-top:4px;margin-bottom:24px;}

/* tabs */
.mp-tabs{display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap;}
.mp-tab{padding:7px 16px;border-radius:999px;font-size:12px;font-weight:700;cursor:pointer;border:1.5px solid #e2e8f0;background:#fff;color:#64748b;font-family:'Inter',sans-serif;transition:all .15s;}
.mp-tab.active{background:#0077b5;color:#fff;border-color:#0077b5;box-shadow:0 2px 10px rgba(0,119,181,0.25);}
.mp-tab:hover:not(.active){border-color:#0077b5;color:#0077b5;}

/* card */
.mp-card{background:#fff;border-radius:18px;box-shadow:0 2px 14px rgba(0,0,0,0.07);padding:20px 22px;margin-bottom:12px;display:flex;gap:16px;align-items:flex-start;transition:box-shadow .15s;}
.mp-card:hover{box-shadow:0 4px 24px rgba(0,119,181,0.11);}
.mp-card.withdrawn{opacity:.6;}

/* client avatar */
.mp-avatar{width:48px;height:48px;border-radius:13px;overflow:hidden;background:#dde4ea;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.mp-avatar img{width:100%;height:100%;object-fit:cover;}

/* body */
.mp-body{flex:1;min-width:0;}
.mp-post-title{font-size:15px;font-weight:800;color:#0D1B2A;line-height:1.3;cursor:pointer;transition:color .15s;}
.mp-post-title:hover{color:#0077b5;}
.mp-client-name{font-size:12px;color:#64748b;margin-top:3px;}
.mp-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px;}
.mp-type-badge{padding:3px 9px;border-radius:999px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;}
.mp-type-JOB{background:#dbeafe;color:#1e40af;}
.mp-type-TASK{background:#dcfce7;color:#166534;}
.mp-type-COLLAB{background:#fef9c3;color:#854d0e;}
.mp-type-SKILL_EXCHANGE{background:#fae8ff;color:#7e22ce;}
.mp-budget{font-size:11px;font-weight:700;color:#64748b;}
.mp-proposed{font-size:11px;font-weight:700;color:#0077b5;background:#e8f4fd;padding:3px 9px;border-radius:999px;}
.mp-date{font-size:10px;color:#94a3b8;}

/* cover letter preview */
.mp-cover{font-size:13px;color:#536279;line-height:1.6;margin-top:10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}

/* status badge */
.mp-status{padding:5px 12px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;flex-shrink:0;align-self:flex-start;}
.mp-status.PENDING  {background:#fef9c3;color:#854d0e;border:1px solid #fde047;}
.mp-status.ACCEPTED {background:#dcfce7;color:#15803d;border:1px solid #86efac;}
.mp-status.REJECTED {background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;}
.mp-status.WITHDRAWN{background:#f3f4f6;color:#6b7280;border:1px solid #d1d5db;}

/* action col */
.mp-actions{display:flex;flex-direction:column;gap:8px;align-items:flex-end;flex-shrink:0;}
.mp-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 16px;border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all .15s;white-space:nowrap;}
.mp-btn:active:not(:disabled){transform:scale(.97);}
.mp-btn:disabled{opacity:.5;cursor:not-allowed;}
.mp-btn-escrow{background:#0077b5;color:#fff;box-shadow:0 2px 10px rgba(0,119,181,0.25);}
.mp-btn-escrow:hover:not(:disabled){background:#005d8f;}
.mp-btn-post{background:#f0f9ff;color:#0077b5;border:1.5px solid #bae6fd;}
.mp-btn-post:hover:not(:disabled){background:#e8f4fd;}
.mp-btn-withdraw{background:#fff;color:#dc2626;border:1.5px solid #fca5a5;font-size:11px;padding:7px 14px;}
.mp-btn-withdraw:hover:not(:disabled){background:#fef2f2;}

.mp-spin{width:13px;height:13px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;animation:mp-spin .7s linear infinite;}

/* escrow status inside card */
.mp-escrow-info{display:flex;align-items:center;gap:6px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:8px 12px;margin-top:10px;}
.mp-escrow-label{font-size:11px;font-weight:700;color:#15803d;}
.mp-escrow-status{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#16a34a;}
.mp-escrow-info.funded{background:#dbeafe;border-color:#93c5fd;}
.mp-escrow-info.funded .mp-escrow-label{color:#1e40af;}
.mp-escrow-info.funded .mp-escrow-status{color:#2563eb;}
.mp-escrow-info.review{background:#fef9c3;border-color:#fde047;}
.mp-escrow-info.review .mp-escrow-label{color:#854d0e;}
.mp-escrow-info.review .mp-escrow-status{color:#92400e;}

/* empty */
.mp-empty{background:#fff;border-radius:20px;padding:56px 32px;text-align:center;box-shadow:0 2px 20px rgba(0,0,0,0.07);}
`

/* ══════════════════════════════════════
   HELPERS
══════════════════════════════════════ */
function fmt(n?: number) {
  if (!n) return null
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n) }
  catch { return `₹${n}` }
}
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
function getClientName(c: ClientInfo) {
  return c.companyProfile?.companyName ?? c.clientProfile?.fullName ?? 'Client'
}
function getClientImage(c: ClientInfo) {
  return c.companyProfile?.profileImage ?? c.clientProfile?.profileImage
}
function getEscrow(p: MyProposal) {
  return p.post.tasks?.[0]?.escrow ?? null
}

function escrowClass(status?: string) {
  if (!status) return ''
  const s = status.toLowerCase()
  if (s === 'funded' || s === 'in_progress') return 'funded'
  if (s === 'review') return 'review'
  return ''
}

/* ══════════════════════════════════════
   CARD
══════════════════════════════════════ */
function ProposalCard({
  proposal, onWithdraw, withdrawingId,
}: {
  proposal: MyProposal
  onWithdraw: (p: MyProposal) => void
  withdrawingId: string | null
}) {
  const router  = useRouter()
  const client  = proposal.post.client
  const escrow  = getEscrow(proposal)
  const clientName  = getClientName(client)
  const clientImage = getClientImage(client)

  return (
    <div className={`mp-card ${proposal.status === 'WITHDRAWN' ? 'withdrawn' : ''}`}>
      {/* client avatar */}
      <div className="mp-avatar">
        {clientImage
          ? <img src={clientImage} alt={clientName} />
          : <svg width="22" height="22" viewBox="0 0 24 24" fill="#94a3b8"><path d="M12 7V3H2v18h20V7H12z"/></svg>
        }
      </div>

      {/* body */}
      <div className="mp-body">
        <p className="mp-post-title" onClick={() => router.push(`/posts/${proposal.post.id}`)}>
          {proposal.post.title}
        </p>
        <p className="mp-client-name">by {clientName}</p>

        <div className="mp-meta">
          <span className={`mp-type-badge mp-type-${proposal.post.type}`}>
            {proposal.post.type.replace('_', ' ')}
          </span>
          {proposal.post.budget && <span className="mp-budget">Budget: {fmt(proposal.post.budget)}</span>}
          {proposal.proposedRate  && <span className="mp-proposed">Your bid: {fmt(proposal.proposedRate)}</span>}
          <span className="mp-date">{timeAgo(proposal.createdAt)}</span>
        </div>

        <p className="mp-cover">{proposal.coverLetter}</p>

        {/* escrow status if accepted */}
        {proposal.status === 'ACCEPTED' && escrow && (
          <div className={`mp-escrow-info ${escrowClass(escrow.status)}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11 17h2v-1h1c.55 0 1-.45 1-1v-3c0-.55-.45-1-1-1h-3v-1h4V8h-2V7h-2v1h-1c-.55 0-1 .45-1 1v3c0 .55.45 1 1 1h3v1H9v2h2v1zm9-13H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4V6h16v12z"/></svg>
            <span className="mp-escrow-label">
              {escrow.status === 'CREATED' && 'Waiting for client to fund escrow…'}
              {(escrow.status === 'FUNDED' || escrow.status === 'IN_PROGRESS') && 'Escrow funded — start working!'}
              {escrow.status === 'REVIEW'   && 'Work under review by client'}
              {escrow.status === 'RELEASED' && 'Payment released to your wallet!'}
              {escrow.status === 'DISPUTED' && 'Dispute in progress'}
            </span>
            <span className="mp-escrow-status">{escrow.status}</span>
          </div>
        )}

        {proposal.status === 'ACCEPTED' && !escrow && (
          <div className="mp-escrow-info">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#15803d"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
            <span className="mp-escrow-label">Accepted — escrow being set up</span>
          </div>
        )}
      </div>

      {/* status + actions */}
      <div className="mp-actions">
        <span className={`mp-status ${proposal.status}`}>{proposal.status}</span>

        {proposal.status === 'ACCEPTED' && escrow && (
          <button
            className="mp-btn mp-btn-escrow"
            onClick={() => router.push(`/payment/escrow/${escrow.id}`)}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M11 17h2v-1h1c.55 0 1-.45 1-1v-3c0-.55-.45-1-1-1h-3v-1h4V8h-2V7h-2v1h-1c-.55 0-1 .45-1 1v3c0 .55.45 1 1 1h3v1H9v2h2v1zm9-13H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2z"/></svg>
            View Escrow
          </button>
        )}

        <button
          className="mp-btn mp-btn-post"
          onClick={() => router.push(`/posts/${proposal.post.id}`)}
        >
          View Post
        </button>

        {proposal.status === 'PENDING' && (
          <button
            className="mp-btn mp-btn-withdraw"
            onClick={() => onWithdraw(proposal)}
            disabled={withdrawingId === proposal.id}
          >
            {withdrawingId === proposal.id ? <span className="mp-spin" /> : 'Withdraw'}
          </button>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════
   PAGE
══════════════════════════════════════ */
type FilterTab = 'all' | 'pending' | 'accepted' | 'rejected' | 'withdrawn'

export default function MyProposalsPage() {
  const [proposals,    setProposals]    = useState<MyProposal[]>([])
  const [loading,      setLoading]      = useState(true)
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null)
  const [filter,       setFilter]       = useState<FilterTab>('all')

  useEffect(() => {
    postService.getMyProposals()
      .then(res => setProposals(res?.data ?? res ?? []))
      .catch(() => toast.error('Failed to load proposals'))
      .finally(() => setLoading(false))
  }, [])

  async function handleWithdraw(proposal: MyProposal) {
    setWithdrawingId(proposal.id)
    try {
      await postService.withdrawProposal(proposal.post.id, proposal.id)
      toast.success('Proposal withdrawn.')
      setProposals(prev => prev.map(p =>
        p.id === proposal.id ? { ...p, status: 'WITHDRAWN' as ProposalStatus } : p
      ))
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to withdraw proposal')
    } finally { setWithdrawingId(null) }
  }

  const filtered = filter === 'all' ? proposals : proposals.filter(p => p.status.toLowerCase() === filter)

  const counts = {
    all:       proposals.length,
    pending:   proposals.filter(p => p.status === 'PENDING').length,
    accepted:  proposals.filter(p => p.status === 'ACCEPTED').length,
    rejected:  proposals.filter(p => p.status === 'REJECTED').length,
    withdrawn: proposals.filter(p => p.status === 'WITHDRAWN').length,
  }

  return (
    <div className="mp-page">
      <style>{STYLES}</style>
      <div className="mp-wrap">
        <h1 className="mp-heading">My Proposals</h1>
        <p className="mp-sub">Track proposals you've sent and your escrow status</p>

        {/* tabs */}
        <div className="mp-tabs">
          {(['all', 'pending', 'accepted', 'rejected', 'withdrawn'] as FilterTab[]).map(t => (
            <button key={t} className={`mp-tab ${filter === t ? 'active' : ''}`} onClick={() => setFilter(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)} ({counts[t]})
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ background: '#fff', borderRadius: 18, padding: 22, boxShadow: '0 2px 14px rgba(0,0,0,0.07)', display: 'flex', gap: 16 }}>
                <div className="mp-skel" style={{ width: 48, height: 48, borderRadius: 13, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="mp-skel" style={{ height: 14, width: '40%', marginBottom: 10 }} />
                  <div className="mp-skel" style={{ height: 11, width: '25%', marginBottom: 10 }} />
                  <div className="mp-skel" style={{ height: 11, width: '70%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mp-empty">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="#e2e8f0" style={{ marginBottom: 14, display: 'block', margin: '0 auto 14px' }}>
              <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
            </svg>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#0D1B2A' }}>
              {filter === 'all' ? "You haven't sent any proposals yet" : `No ${filter} proposals`}
            </p>
            <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>
              {filter === 'all'
                ? 'Browse posts and apply to opportunities that match your skills.'
                : `You have no ${filter} proposals at this time.`}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {filtered.map(p => (
              <ProposalCard
                key={p.id}
                proposal={p}
                onWithdraw={handleWithdraw}
                withdrawingId={withdrawingId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
