'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { notificationService } from '../../../services/notification.service'
import { postService } from '../../../services/post.service'
import { useAuthStore } from '../../../store/authStore'
import { getSocketClient } from '../../../utils/socketClient'

// ─── Types ────────────────────────────────────────────────────────────────────

type NotifType = string

interface Notification {
  id: string
  type: NotifType
  title: string
  message: string
  isRead: boolean
  link?: string | null
  metadata?: Record<string, any> | null
  createdAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function getInitials(name?: string | null) {
  return (name || 'X').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'X'
}

const TYPE_ICON: Record<string, string> = {
  NEW_PROPOSAL: '📋', PROPOSAL_ACCEPTED: '✅', PROPOSAL_REJECTED: '✕',
  ESCROW_FUNDED: '💰', TASK_COMPLETED: '🔍', PAYMENT_RECEIVED: '💸',
  PAYMENT_RELEASED: '💸', NEW_MESSAGE: '💬', CONNECTION_REQUEST: '🤝',
  CONNECTION_ACCEPTED: '🤝', DISPUTE_OPENED: '⚠️', DISPUTE_RESOLVED: '✅',
  REVIEW_RECEIVED: '⭐',
}

const TYPE_COLOR: Record<string, string> = {
  NEW_PROPOSAL: '#0077b5', PROPOSAL_ACCEPTED: '#16a34a', PROPOSAL_REJECTED: '#dc2626',
  ESCROW_FUNDED: '#16a34a', TASK_COMPLETED: '#d97706', PAYMENT_RECEIVED: '#16a34a',
  PAYMENT_RELEASED: '#16a34a', NEW_MESSAGE: '#0077b5', CONNECTION_REQUEST: '#7c3aed',
  DISPUTE_OPENED: '#dc2626', DISPUTE_RESOLVED: '#16a34a',
}

// ─── Proposal card (embedded in NEW_PROPOSAL notification) ────────────────────

interface ProposalData {
  freelancerName: string | null
  freelancerTitle: string | null
  freelancerImage: string | null
  freelancerId: string | null
  coverLetter: string
  proposedRate: number | null
  postTitle: string | null
  postId: string | null
  status: string
}

function ProposalCard({
  notif,
  onAccepted,
  onRejected,
}: {
  notif: Notification
  onAccepted: (escrowId: string) => void
  onRejected: () => void
}) {
  const m = notif.metadata ?? {}
  const [accepting, setAccepting] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [done, setDone] = useState<'accepted' | 'rejected' | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [statusChecked, setStatusChecked] = useState(false)
  const [proposal, setProposal] = useState<ProposalData | null>(null)

  // Fetch full proposal data on mount — handles old notifications with incomplete metadata
  useEffect(() => {
    if (!m.proposalId) { setStatusChecked(true); return }
    postService.getProposal(m.proposalId).then(res => {
      const d = res?.data
      if (!d) return
      const fp = d.freelancer?.freelancerProfile
      const cp = d.freelancer?.companyProfile
      const clp = d.freelancer?.clientProfile
      setProposal({
        freelancerName: fp?.fullName ?? cp?.companyName ?? clp?.fullName ?? m.freelancerName ?? null,
        freelancerTitle: fp?.title ?? m.freelancerTitle ?? null,
        freelancerImage: fp?.profileImage ?? cp?.profileImage ?? clp?.profileImage ?? m.freelancerImage ?? null,
        freelancerId: d.freelancerId ?? m.freelancerId ?? null,
        coverLetter: d.coverLetter ?? m.coverLetter ?? '',
        proposedRate: d.proposedRate ?? m.proposedRate ?? null,
        postTitle: d.post?.title ?? m.postTitle ?? null,
        postId: d.postId ?? m.postId ?? null,
        status: d.status,
      })
      const status = d.status
      if (status === 'ACCEPTED') setDone('accepted')
      else if (status === 'REJECTED' || status === 'WITHDRAWN') setDone('rejected')
    }).catch(() => {
      // Fallback to metadata if API fails
      setProposal({
        freelancerName: m.freelancerName ?? null,
        freelancerTitle: m.freelancerTitle ?? null,
        freelancerImage: m.freelancerImage ?? null,
        freelancerId: m.freelancerId ?? null,
        coverLetter: m.coverLetter ?? '',
        proposedRate: m.proposedRate ?? null,
        postTitle: m.postTitle ?? null,
        postId: m.postId ?? null,
        status: 'PENDING',
      })
    }).finally(() => setStatusChecked(true))
  }, [m.proposalId])

  const p = proposal ?? {
    freelancerName: m.freelancerName ?? null,
    freelancerTitle: m.freelancerTitle ?? null,
    freelancerImage: m.freelancerImage ?? null,
    freelancerId: m.freelancerId ?? null,
    coverLetter: m.coverLetter ?? '',
    proposedRate: m.proposedRate ?? null,
    postTitle: m.postTitle ?? null,
    postId: m.postId ?? null,
    status: 'PENDING',
  }
  const cl = String(p.coverLetter ?? '')
  const isLong = cl.length > 180

  const accept = async () => {
    if (!m.proposalId || !p.postId) return
    setAccepting(true)
    try {
      const res = await postService.acceptProposal(p.postId, m.proposalId)
      setDone('accepted')
      toast.success('Proposal accepted! Escrow created.')
      onAccepted(res?.data?.escrowId ?? '')
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to accept')
    } finally { setAccepting(false) }
  }

  const reject = async () => {
    if (!m.proposalId || !p.postId) return
    setRejecting(true)
    try {
      await postService.rejectProposal(p.postId, m.proposalId)
      setDone('rejected')
      toast.success('Proposal declined.')
      onRejected()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to reject')
    } finally { setRejecting(false) }
  }

  return (
    <div style={{ background: '#f8fafc', border: '1.5px solid #e0e7ef', borderRadius: 14, padding: '14px 16px', marginTop: 10 }}>
      {/* Freelancer info row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
          background: '#e8f4fd', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#005d8f', overflow: 'hidden',
        }}>
          {p.freelancerImage
            ? <img src={p.freelancerImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : getInitials(p.freelancerName)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1b1c1a' }}>{p.freelancerName || 'Freelancer'}</p>
          {p.freelancerTitle && <p style={{ margin: 0, fontSize: 12, color: '#707881' }}>{p.freelancerTitle}</p>}
        </div>
        {p.proposedRate != null && (
          <span style={{
            fontSize: 13, fontWeight: 700, color: '#16a34a',
            background: '#f0fdf4', padding: '3px 10px', borderRadius: 8, flexShrink: 0,
          }}>
            ₹{Number(p.proposedRate).toLocaleString('en-IN')}
          </span>
        )}
      </div>

      {/* Post */}
      {p.postTitle && (
        <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: '#707881' }}>
          Proposal for: <span style={{ color: '#0077b5' }}>&ldquo;{p.postTitle}&rdquo;</span>
        </p>
      )}

      {/* Cover letter */}
      {cl && (
        <div style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', marginBottom: 12, border: '1px solid #e5e7eb' }}>
          <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {isLong && !expanded ? `${cl.slice(0, 180)}…` : cl}
          </p>
          {isLong && (
            <button type="button" onClick={() => setExpanded(e => !e)}
              style={{ fontSize: 12, color: '#0077b5', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0 0', display: 'block' }}>
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      {/* Action buttons */}
      {/* View Profile is always visible */}
      {p.freelancerId && (
        <div style={{ marginBottom: 8 }}>
          <Link href={`/users/${p.freelancerId}`} target="_blank"
            style={{
              display: 'inline-block', padding: '8px 16px',
              background: '#f0f7ff', color: '#005d8f',
              border: '1.5px solid #bdd8f0', borderRadius: 10,
              fontSize: 13, fontWeight: 700, textDecoration: 'none',
            }}>
            View Profile →
          </Link>
        </div>
      )}

      {!statusChecked ? (
        <div style={{ height: 38, borderRadius: 10, background: '#f0f3f6', animation: 'pulse 1.4s ease infinite' }} />
      ) : done === null ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={accept} disabled={accepting || rejecting}
            style={{
              flex: 1, minWidth: 90, padding: '9px 14px',
              background: 'linear-gradient(135deg,#005d8f,#0077b5)',
              color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              opacity: accepting || rejecting ? .65 : 1,
            }}>
            {accepting ? 'Accepting…' : '✓ Accept'}
          </button>
          <button type="button" onClick={reject} disabled={accepting || rejecting}
            style={{
              flex: 1, minWidth: 90, padding: '9px 14px',
              background: '#fff0f0', color: '#dc2626',
              border: '1.5px solid #fca5a5', borderRadius: 10,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              opacity: accepting || rejecting ? .65 : 1,
            }}>
            {rejecting ? '…' : '✕ Decline'}
          </button>
        </div>
      ) : done === 'accepted' ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, padding: '10px 14px', background: '#f0fdf4', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
            ✓ Accepted
          </div>
          <Link href="/payment/escrow" style={{
            padding: '10px 14px', background: '#0077b5', color: '#fff',
            borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none',
          }}>
            View Escrow →
          </Link>
        </div>
      ) : (
        <div style={{ padding: '10px 14px', background: '#fff1f2', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#dc2626' }}>
          ✕ Proposal declined
        </div>
      )}
    </div>
  )
}

// ─── Single notification row ──────────────────────────────────────────────────

function NotifRow({
  notif,
  onAccepted,
  onRejected,
  onRead,
}: {
  notif: Notification
  onAccepted: (eid: string) => void
  onRejected: () => void
  onRead: (id: string) => void
}) {
  const router = useRouter()
  const icon = TYPE_ICON[notif.type] ?? '🔔'
  const color = TYPE_COLOR[notif.type] ?? '#707881'
  const isProposal = notif.type === 'NEW_PROPOSAL'

  const handleClick = () => {
    if (!notif.isRead) onRead(notif.id)
    if (!isProposal && notif.link) router.push(notif.link)
  }

  return (
    <div
      onClick={handleClick}
      style={{
        padding: '16px 18px',
        background: notif.isRead ? '#fff' : '#f0f7ff',
        borderBottom: '1px solid #f0f3f6',
        cursor: isProposal ? 'default' : notif.link ? 'pointer' : 'default',
        transition: 'background .15s',
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* Icon */}
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
        }}>
          {icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: notif.isRead ? 600 : 700, color: '#1b1c1a', lineHeight: 1.4 }}>
              {notif.title}
            </p>
            <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0, marginTop: 1 }}>{timeAgo(notif.createdAt)}</span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#5a6470', lineHeight: 1.55 }}>{notif.message}</p>

          {isProposal && notif.metadata && (
            <ProposalCard notif={notif} onAccepted={onAccepted} onRejected={onRejected} />
          )}

          {!isProposal && notif.link && (
            <Link href={notif.link} onClick={e => e.stopPropagation()}
              style={{ fontSize: 12, color: '#0077b5', fontWeight: 600, marginTop: 6, display: 'inline-block' }}>
              View →
            </Link>
          )}
        </div>

        {!notif.isRead && (
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#0077b5', flexShrink: 0, marginTop: 6 }} />
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const unreadCount = notifications.filter(n => !n.isRead).length

  // Load
  useEffect(() => {
    let ignore = false
    async function load() {
      try {
        const res = await notificationService.getNotifications()
        if (!ignore) setNotifications(res?.data ?? [])
      } catch { toast.error('Failed to load notifications') }
      finally { if (!ignore) setLoading(false) }
    }
    void load()
    return () => { ignore = true }
  }, [])

  // Real-time socket
  useEffect(() => {
    if (!user?.id) return
    const socket = getSocketClient()
    socket.emit('join_user', user.id)
    const handle = (notif: Notification) => {
      setNotifications(prev => [notif, ...prev])
      toast(`${notif.title}`, { icon: TYPE_ICON[notif.type] ?? '🔔' })
    }
    socket.on('notification', handle)
    return () => { socket.off('notification', handle) }
  }, [user?.id])

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    try { await notificationService.markAsRead(id) } catch {}
  }

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    try { await notificationService.markAllAsRead() } catch {}
    toast.success('All notifications marked as read')
  }

  const handleAccepted = (escrowId: string) => {
    if (escrowId) router.push(`/payment/escrow/${escrowId}`)
  }

  const visible = filter === 'unread' ? notifications.filter(n => !n.isRead) : notifications

  return (
    <main style={{ minHeight: '100vh', background: '#EDF1F7', paddingBottom: 80 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        body{font-family:'Inter',sans-serif;}
        .al-tab{padding:7px 16px;border-radius:20px;font-size:13px;font-weight:600;border:none;cursor:pointer;transition:all .15s;font-family:'Inter',sans-serif;}
        .al-active{background:#0077b5;color:#fff;box-shadow:0 4px 12px rgba(0,119,181,.3);}
        .al-inactive{background:rgba(255,255,255,.25);color:rgba(255,255,255,.9);border:1.5px solid rgba(255,255,255,.3);}
        .al-inactive:hover{background:rgba(255,255,255,.4);}
      `}</style>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg,#005d8f 0%,#0077b5 100%)',
        padding: '52px 20px 22px', color: '#fff',
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', opacity: .75 }}>
            Activity
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 6 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
              Notifications
              {unreadCount > 0 && (
                <span style={{
                  fontSize: 12, fontWeight: 700, background: '#ff4d4f', color: '#fff',
                  padding: '2px 9px', borderRadius: 20,
                }}>
                  {unreadCount}
                </span>
              )}
            </h1>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead}
                style={{
                  background: 'rgba(255,255,255,.2)', color: '#fff',
                  border: '1px solid rgba(255,255,255,.35)', borderRadius: 20,
                  padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'Inter,sans-serif',
                }}>
                Mark all read
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className={`al-tab ${filter === 'all' ? 'al-active' : 'al-inactive'}`}
              onClick={() => setFilter('all')}>
              All {notifications.length > 0 && `(${notifications.length})`}
            </button>
            <button className={`al-tab ${filter === 'unread' ? 'al-active' : 'al-inactive'}`}
              onClick={() => setFilter('unread')}>
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div style={{ maxWidth: 640, margin: '16px auto 0', padding: '0 12px' }}>
        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#707881', fontSize: 14 }}>Loading…</div>
          ) : visible.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
              <p style={{ margin: 0, fontWeight: 700, color: '#1b1c1a', fontSize: 16, fontFamily: 'Inter,sans-serif' }}>
                {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
              </p>
              <p style={{ margin: '6px 0 0', color: '#707881', fontSize: 14, fontFamily: 'Inter,sans-serif' }}>
                Proposal alerts, payment updates and more will appear here.
              </p>
            </div>
          ) : (
            visible.map(notif => (
              <NotifRow
                key={notif.id}
                notif={notif}
                onAccepted={handleAccepted}
                onRejected={() => markRead(notif.id)}
                onRead={markRead}
              />
            ))
          )}
        </div>
      </div>
    </main>
  )
}
