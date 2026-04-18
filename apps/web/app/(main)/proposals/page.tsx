'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { postService } from '@/services/post.service'
import { useAuthStore } from '@/store/authStore'

/* ══════════════════════════════════════
   TYPES
══════════════════════════════════════ */
type ProposalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN'
type PostType = 'JOB' | 'TASK' | 'COLLAB' | 'SKILL_EXCHANGE'

interface FreelancerInfo {
  id: string
  role: string
  freelancerProfile?: { fullName?: string; profileImage?: string; title?: string; avgRating?: number; totalReviews?: number; hourlyRate?: number; skills?: string[]; country?: string; city?: string }
  companyProfile?: { companyName?: string; profileImage?: string }
  clientProfile?:  { fullName?: string; profileImage?: string }
}
interface TaskInfo  { id: string; freelancerId?: string; escrow?: { id: string; status: string } | null }
interface PostInfo  { id: string; title: string; type: PostType; budget?: number; status: string; tasks: TaskInfo[] }
interface Proposal  { id: string; postId: string; status: ProposalStatus; coverLetter: string; proposedRate?: number; createdAt: string; post: PostInfo; freelancer: FreelancerInfo }

/* ══════════════════════════════════════
   STYLES
══════════════════════════════════════ */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
@keyframes rp-shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}
@keyframes rp-spin{to{transform:rotate(360deg);}}
.rp-skel{background:linear-gradient(90deg,#e8eaed 25%,#f5f5f5 50%,#e8eaed 75%);background-size:1200px 100%;animation:rp-shimmer 1.4s ease infinite;border-radius:8px;}

.rp-page{min-height:100vh;background:#EDF1F7;font-family:'Inter',sans-serif;padding:28px 16px 80px;}
.rp-wrap{max-width:900px;margin:0 auto;}
.rp-heading{font-size:24px;font-weight:800;color:#0D1B2A;letter-spacing:-0.02em;}
.rp-sub{font-size:14px;color:#64748b;margin-top:4px;margin-bottom:24px;}

/* post group */
.rp-group{background:#fff;border-radius:20px;box-shadow:0 2px 20px rgba(0,0,0,0.07);overflow:hidden;margin-bottom:20px;}
.rp-group-hdr{padding:16px 22px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;}
.rp-post-title{font-size:16px;font-weight:800;color:#0D1B2A;}
.rp-type-badge{padding:4px 11px;border-radius:999px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;flex-shrink:0;}
.rp-type-JOB{background:#dbeafe;color:#1e40af;}
.rp-type-TASK{background:#dcfce7;color:#166534;}
.rp-type-COLLAB{background:#fef9c3;color:#854d0e;}
.rp-type-SKILL_EXCHANGE{background:#fae8ff;color:#7e22ce;}
.rp-budget{font-size:13px;font-weight:700;color:#0077b5;}
.rp-count{font-size:11px;color:#94a3b8;font-weight:600;}

/* proposal card */
.rp-card{display:flex;gap:16px;padding:18px 22px;border-bottom:1px solid #f8fafc;transition:background .15s;}
.rp-card:last-child{border-bottom:none;}
.rp-card:hover{background:#fafbfc;}
.rp-card.withdrawn{opacity:.55;}

/* avatar */
.rp-avatar{width:52px;height:52px;border-radius:14px;overflow:hidden;background:#dde4ea;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.rp-avatar img{width:100%;height:100%;object-fit:cover;}

/* main content */
.rp-content{flex:1;min-width:0;}
.rp-name-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.rp-name{font-size:15px;font-weight:800;color:#0D1B2A;cursor:pointer;transition:color .15s;}
.rp-name:hover{color:#0077b5;}
.rp-freelancer-title{font-size:12px;color:#64748b;margin-top:1px;}
.rp-meta-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:4px;}
.rp-location{font-size:11px;color:#94a3b8;display:flex;align-items:center;gap:3px;}
.rp-stars{display:flex;align-items:center;gap:3px;font-size:11px;font-weight:700;color:#f59e0b;}
.rp-rate-chip{display:inline-flex;align-items:center;gap:4px;background:#f0f9ff;color:#0369a1;font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;border:1px solid #bae6fd;}
.rp-proposed-rate{display:inline-flex;align-items:center;gap:4px;background:#eff6ff;color:#1e40af;font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;border:1px solid #93c5fd;}
.rp-cover{font-size:13px;color:#536279;line-height:1.65;margin-top:10px;}
.rp-cover.collapsed{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
.rp-expand-btn{font-size:11px;font-weight:700;color:#0077b5;cursor:pointer;background:none;border:none;font-family:'Inter',sans-serif;margin-top:4px;padding:0;}
.rp-date{font-size:10px;color:#94a3b8;margin-top:6px;}

/* status badge */
.rp-status{padding:4px 10px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;}
.rp-status.PENDING   {background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;}
.rp-status.ACCEPTED  {background:#dcfce7;color:#15803d;border:1px solid #86efac;}
.rp-status.REJECTED  {background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;}
.rp-status.WITHDRAWN {background:#f3f4f6;color:#6b7280;border:1px solid #d1d5db;}

/* skills */
.rp-skills{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px;}
.rp-skill{background:#f1f5f9;color:#475569;font-size:10px;font-weight:600;padding:3px 9px;border-radius:999px;}

/* actions */
.rp-actions{display:flex;flex-direction:column;gap:8px;align-items:flex-end;flex-shrink:0;padding-top:2px;}
.rp-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 16px;border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all .15s;white-space:nowrap;}
.rp-btn:active:not(:disabled){transform:scale(.97);}
.rp-btn:disabled{opacity:.5;cursor:not-allowed;}
.rp-btn-primary{background:#0077b5;color:#fff;box-shadow:0 2px 10px rgba(0,119,181,0.25);}
.rp-btn-primary:hover:not(:disabled){background:#005d8f;}
.rp-btn-success{background:#16a34a;color:#fff;box-shadow:0 2px 10px rgba(22,163,74,0.2);}
.rp-btn-success:hover:not(:disabled){background:#15803d;}
.rp-btn-ghost{background:#f8fafc;color:#475569;border:1.5px solid #e2e8f0;}
.rp-btn-ghost:hover:not(:disabled){border-color:#0077b5;color:#0077b5;}
.rp-btn-danger{background:#fff;color:#dc2626;border:1.5px solid #fca5a5;}
.rp-btn-danger:hover:not(:disabled){background:#fef2f2;}
.rp-btn-escrow{background:#dcfce7;color:#15803d;border:1.5px solid #86efac;}
.rp-btn-escrow:hover:not(:disabled){background:#bbf7d0;}

/* spinner */
.rp-spin{width:13px;height:13px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;animation:rp-spin .7s linear infinite;}

/* filter tabs */
.rp-tabs{display:flex;gap:6px;margin-bottom:18px;flex-wrap:wrap;}
.rp-tab{padding:7px 16px;border-radius:999px;font-size:12px;font-weight:700;cursor:pointer;border:1.5px solid #e2e8f0;background:#fff;color:#64748b;font-family:'Inter',sans-serif;transition:all .15s;}
.rp-tab.active{background:#0077b5;color:#fff;border-color:#0077b5;box-shadow:0 2px 10px rgba(0,119,181,0.25);}
.rp-tab:hover:not(.active){border-color:#0077b5;color:#0077b5;}

/* empty */
.rp-empty{background:#fff;border-radius:20px;padding:56px 32px;text-align:center;box-shadow:0 2px 20px rgba(0,0,0,0.07);}
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
function getName(f: FreelancerInfo) {
  return f.freelancerProfile?.fullName ?? f.companyProfile?.companyName ?? f.clientProfile?.fullName ?? 'User'
}
function getImage(f: FreelancerInfo) {
  return f.freelancerProfile?.profileImage ?? f.companyProfile?.profileImage ?? f.clientProfile?.profileImage
}
function getEscrowId(proposal: Proposal) {
  const task = proposal.post.tasks.find(t => t.freelancerId === proposal.freelancer.id)
  return task?.escrow?.id
}

function Stars({ rating }: { rating?: number }) {
  const r = Math.round(rating ?? 0)
  return (
    <span className="rp-stars">
      {[1,2,3,4,5].map(i => (
        <svg key={i} width="10" height="10" viewBox="0 0 24 24" fill={i <= r ? '#f59e0b' : '#e2e8f0'}>
          <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
        </svg>
      ))}
      {rating ? <span style={{ color: '#94a3b8' }}>({rating.toFixed(1)})</span> : null}
    </span>
  )
}

/* ══════════════════════════════════════
   PROPOSAL CARD
══════════════════════════════════════ */
function ProposalCard({
  proposal, onAccept, onReject, loadingId,
}: {
  proposal: Proposal
  onAccept: (p: Proposal) => void
  onReject: (p: Proposal) => void
  loadingId: string | null
}) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const fp      = proposal.freelancer.freelancerProfile
  const name    = getName(proposal.freelancer)
  const img     = getImage(proposal.freelancer)
  const escrowId = getEscrowId(proposal)
  const isLoading = loadingId === proposal.id
  const loc = [fp?.city, fp?.country].filter(Boolean).join(', ')

  return (
    <div className={`rp-card ${proposal.status === 'WITHDRAWN' ? 'withdrawn' : ''}`}>
      {/* avatar */}
      <div className="rp-avatar">
        {img
          ? <img src={img} alt={name} />
          : <svg width="24" height="24" viewBox="0 0 24 24" fill="#94a3b8"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
        }
      </div>

      {/* content */}
      <div className="rp-content">
        <div className="rp-name-row">
          <span className="rp-name" onClick={() => router.push(`/users/${proposal.freelancer.id}`)}>
            {name}
          </span>
          <span className={`rp-status ${proposal.status}`}>{proposal.status}</span>
        </div>

        {fp?.title && <p className="rp-freelancer-title">{fp.title}</p>}

        <div className="rp-meta-row">
          {loc && (
            <span className="rp-location">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#94a3b8"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
              {loc}
            </span>
          )}
          {fp?.avgRating ? <Stars rating={fp.avgRating} /> : null}
          {fp?.hourlyRate && <span className="rp-rate-chip">₹{fp.hourlyRate}/hr</span>}
          {proposal.proposedRate && <span className="rp-proposed-rate">Bid: {fmt(proposal.proposedRate)}</span>}
        </div>

        {fp?.skills && fp.skills.length > 0 && (
          <div className="rp-skills">
            {fp.skills.slice(0, 5).map(s => <span key={s} className="rp-skill">{s}</span>)}
            {fp.skills.length > 5 && <span className="rp-skill">+{fp.skills.length - 5}</span>}
          </div>
        )}

        <p className={`rp-cover ${expanded ? '' : 'collapsed'}`}>{proposal.coverLetter}</p>
        {proposal.coverLetter.length > 200 && (
          <button className="rp-expand-btn" onClick={() => setExpanded(e => !e)}>
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
        <p className="rp-date">{timeAgo(proposal.createdAt)}</p>
      </div>

      {/* actions */}
      <div className="rp-actions">
        {/* view profile — always shown */}
        <button
          className="rp-btn rp-btn-ghost"
          onClick={() => router.push(`/users/${proposal.freelancer.id}`)}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          View Profile
        </button>

        {proposal.status === 'PENDING' && (
          <>
            <button
              className="rp-btn rp-btn-primary"
              onClick={() => onAccept(proposal)}
              disabled={!!loadingId}
            >
              {isLoading ? <span className="rp-spin" /> : <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>}
              Accept
            </button>
            <button
              className="rp-btn rp-btn-danger"
              onClick={() => onReject(proposal)}
              disabled={!!loadingId}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              Reject
            </button>
          </>
        )}

        {proposal.status === 'ACCEPTED' && escrowId && (
          <button
            className="rp-btn rp-btn-escrow"
            onClick={() => router.push(`/payment/escrow/${escrowId}`)}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M11 17h2v-1h1c.55 0 1-.45 1-1v-3c0-.55-.45-1-1-1h-3v-1h4V8h-2V7h-2v1h-1c-.55 0-1 .45-1 1v3c0 .55.45 1 1 1h3v1H9v2h2v1zm9-13H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4V6h16v12z"/></svg>
            View Escrow
          </button>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════
   PAGE
══════════════════════════════════════ */
type FilterTab = 'all' | 'pending' | 'accepted' | 'rejected'

export default function ProposalsReceivedPage() {
  const router = useRouter()
  const { user } = useAuthStore()

  const [proposals,  setProposals]  = useState<Proposal[]>([])
  const [loading,    setLoading]    = useState(true)
  const [loadingId,  setLoadingId]  = useState<string | null>(null)
  const [filter,     setFilter]     = useState<FilterTab>('all')

  useEffect(() => {
    postService.getReceivedProposals()
      .then(res => setProposals(res?.data ?? res ?? []))
      .catch(() => toast.error('Failed to load proposals'))
      .finally(() => setLoading(false))
  }, [])

  async function handleAccept(proposal: Proposal) {
    setLoadingId(proposal.id)
    try {
      const res = await postService.acceptProposal(proposal.post.id, proposal.id)
      const escrowId = res?.data?.escrowId
      toast.success('Proposal accepted! Escrow created.')
      // optimistic update
      setProposals(prev => prev.map(p =>
        p.id === proposal.id ? { ...p, status: 'ACCEPTED' as ProposalStatus } :
        p.post.id === proposal.post.id && p.status === 'PENDING' ? { ...p, status: 'REJECTED' as ProposalStatus } : p
      ))
      if (escrowId) router.push(`/payment/escrow/${escrowId}`)
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to accept proposal')
    } finally { setLoadingId(null) }
  }

  async function handleReject(proposal: Proposal) {
    setLoadingId(proposal.id)
    try {
      await postService.rejectProposal(proposal.post.id, proposal.id)
      toast.success('Proposal rejected.')
      setProposals(prev => prev.map(p =>
        p.id === proposal.id ? { ...p, status: 'REJECTED' as ProposalStatus } : p
      ))
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to reject proposal')
    } finally { setLoadingId(null) }
  }

  // group by post
  const filtered = filter === 'all' ? proposals : proposals.filter(p => p.status.toLowerCase() === filter)
  const byPost = filtered.reduce<Record<string, Proposal[]>>((acc, p) => {
    const key = p.post.id
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})

  const counts = {
    all:      proposals.length,
    pending:  proposals.filter(p => p.status === 'PENDING').length,
    accepted: proposals.filter(p => p.status === 'ACCEPTED').length,
    rejected: proposals.filter(p => p.status === 'REJECTED').length,
  }

  return (
    <div className="rp-page">
      <style>{STYLES}</style>
      <div className="rp-wrap">
        <h1 className="rp-heading">Proposals Received</h1>
        <p className="rp-sub">Review and act on proposals sent to your posts</p>

        {/* filter tabs */}
        <div className="rp-tabs">
          {(['all', 'pending', 'accepted', 'rejected'] as FilterTab[]).map(t => (
            <button key={t} className={`rp-tab ${filter === t ? 'active' : ''}`} onClick={() => setFilter(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)} ({counts[t]})
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 2px 20px rgba(0,0,0,0.07)' }}>
                <div className="rp-skel" style={{ height: 14, width: '35%', marginBottom: 16 }} />
                <div style={{ display: 'flex', gap: 14 }}>
                  <div className="rp-skel" style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="rp-skel" style={{ height: 14, width: '30%', marginBottom: 8 }} />
                    <div className="rp-skel" style={{ height: 12, width: '60%', marginBottom: 8 }} />
                    <div className="rp-skel" style={{ height: 12, width: '80%' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : Object.keys(byPost).length === 0 ? (
          <div className="rp-empty">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="#e2e8f0" style={{ marginBottom: 14, display: 'block', margin: '0 auto 14px' }}>
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#0D1B2A' }}>
              {filter === 'all' ? 'No proposals yet' : `No ${filter} proposals`}
            </p>
            <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>
              {filter === 'all'
                ? 'Once freelancers apply to your posts, their proposals will appear here.'
                : `You have no ${filter} proposals at this time.`}
            </p>
          </div>
        ) : (
          Object.entries(byPost).map(([postId, postProposals]) => {
            const post = postProposals[0].post
            return (
              <div key={postId} className="rp-group">
                <div className="rp-group-hdr">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span className={`rp-type-badge rp-type-${post.type}`}>{post.type.replace('_', ' ')}</span>
                    <span className="rp-post-title">{post.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {post.budget && <span className="rp-budget">{fmt(post.budget)}</span>}
                    <span className="rp-count">{postProposals.length} proposal{postProposals.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                {postProposals.map(proposal => (
                  <ProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    loadingId={loadingId}
                  />
                ))}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
