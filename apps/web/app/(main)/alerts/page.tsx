'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { notificationService } from '../../../services/notification.service'
import { postService } from '../../../services/post.service'
import { useAuthStore } from '../../../store/authStore'
import { getSocketClient } from '../../../utils/socketClient'
import MainHeader from '../../../components/ui/MainHeader'

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
  REVIEW_RECEIVED: '⭐', AGENT_MATCH: '🤖',
}

const TYPE_COLOR: Record<string, string> = {
  NEW_PROPOSAL: '#0077b5', PROPOSAL_ACCEPTED: '#16a34a', PROPOSAL_REJECTED: '#dc2626',
  ESCROW_FUNDED: '#16a34a', TASK_COMPLETED: '#d97706', PAYMENT_RECEIVED: '#16a34a',
  PAYMENT_RELEASED: '#16a34a', NEW_MESSAGE: '#0077b5', CONNECTION_REQUEST: '#7c3aed',
  DISPUTE_OPENED: '#dc2626', DISPUTE_RESOLVED: '#16a34a',
}

// ─── Proposal card ────────────────────────────────────────────────────────────

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
    <div className="mt-3 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
      {/* Freelancer info */}
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#edf5fb] text-sm font-bold text-[#005d8f]">
          {p.freelancerImage
            ? <img src={p.freelancerImage} alt="" className="h-full w-full object-cover" />
            : getInitials(p.freelancerName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[#1b1c1a]">{p.freelancerName || 'Freelancer'}</p>
          {p.freelancerTitle && <p className="truncate text-xs text-[#6b7280]">{p.freelancerTitle}</p>}
        </div>
        {p.proposedRate != null && (
          <span className="flex-shrink-0 rounded-lg bg-green-50 px-2.5 py-1 text-sm font-bold text-green-600">
            ₹{Number(p.proposedRate).toLocaleString('en-IN')}
          </span>
        )}
      </div>

      {/* Post title */}
      {p.postTitle && (
        <p className="mb-2 text-xs font-semibold text-[#6b7280]">
          Proposal for: <span className="text-[#0077b5]">"{p.postTitle}"</span>
        </p>
      )}

      {/* Cover letter */}
      {cl && (
        <div className="mb-3 rounded-xl border border-[#e2e8f0] bg-white p-3">
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-[#374151]">
            {isLong && !expanded ? `${cl.slice(0, 180)}…` : cl}
          </p>
          {isLong && (
            <button type="button" onClick={() => setExpanded(e => !e)}
              className="mt-1 text-xs font-semibold text-[#0077b5]">
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      {/* View Profile */}
      {p.freelancerId && (
        <div className="mb-2">
          <Link href={`/profile/${p.freelancerId}`} target="_blank"
            className="inline-block rounded-xl border border-[#bdd8f0] bg-[#edf5fb] px-4 py-2 text-sm font-bold text-[#005d8f]">
            View Profile →
          </Link>
        </div>
      )}

      {/* Actions */}
      {!statusChecked ? (
        <div className="h-10 animate-pulse rounded-xl bg-[#f0f3f6]" />
      ) : done === null ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={accept} disabled={accepting || rejecting}
            className="flex-1 min-w-[90px] rounded-xl bg-[linear-gradient(135deg,#005d8f,#0077b5)] py-2.5 px-3.5 text-sm font-bold text-white disabled:opacity-60">
            {accepting ? 'Accepting…' : '✓ Accept'}
          </button>
          <button type="button" onClick={reject} disabled={accepting || rejecting}
            className="flex-1 min-w-[90px] rounded-xl border border-red-200 bg-red-50 py-2.5 px-3.5 text-sm font-bold text-red-600 disabled:opacity-60">
            {rejecting ? '…' : '✕ Decline'}
          </button>
        </div>
      ) : done === 'accepted' ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 rounded-xl bg-green-50 py-2.5 px-3.5 text-sm font-bold text-green-600">
            ✓ Accepted
          </div>
          <Link href="/payment/escrow"
            className="rounded-xl bg-[#0077b5] py-2.5 px-3.5 text-sm font-bold text-white">
            View Escrow →
          </Link>
        </div>
      ) : (
        <div className="rounded-xl bg-red-50 py-2.5 px-3.5 text-sm font-bold text-red-600">
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
  const isAgent = notif.type === 'AGENT_MATCH'

  const handleClick = () => {
    if (!notif.isRead) onRead(notif.id)
    if (!isProposal && !isAgent && notif.link) router.push(notif.link)
  }

  const bgCls = notif.isRead
    ? 'bg-white'
    : isAgent
      ? 'bg-purple-50'
      : 'bg-[#f0f7ff]'

  return (
    <div
      onClick={handleClick}
      className={`${bgCls} border-b border-[#f0f3f6] px-5 py-4 transition-colors last:border-b-0 ${!isProposal && !isAgent && notif.link ? 'cursor-pointer hover:bg-[#f8fafc]' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-lg"
          style={{ background: isAgent ? '#ede9fe' : `${color}18` }}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm leading-snug text-[#1b1c1a] ${notif.isRead ? 'font-semibold' : 'font-bold'}`}>
              {notif.title}
            </p>
            <span className="mt-0.5 flex-shrink-0 text-xs text-[#94a3b8]">{timeAgo(notif.createdAt)}</span>
          </div>
          <p className="mt-1 text-xs leading-snug text-[#5a6470]">{notif.message}</p>

          {isProposal && notif.metadata && (
            <ProposalCard notif={notif} onAccepted={onAccepted} onRejected={onRejected} />
          )}

          {isAgent && (
            <div className="mt-2.5">
              <Link
                href="/agent"
                onClick={e => { e.stopPropagation(); if (!notif.isRead) onRead(notif.id) }}
                className="inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#7c3aed,#9333ea)] px-4 py-2 text-sm font-bold text-white"
              >
                🤖 AI Agent
              </Link>
            </div>
          )}

          {!isProposal && !isAgent && notif.link && (
            <Link href={notif.link} onClick={e => e.stopPropagation()}
              className="mt-1.5 inline-block text-xs font-semibold text-[#0077b5]">
              View →
            </Link>
          )}
        </div>

        {!notif.isRead && (
          <div className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${isAgent ? 'bg-purple-500' : 'bg-[#0077b5]'}`} />
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
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const unreadCount = notifications.filter(n => !n.isRead).length

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
    <div className="min-h-screen bg-[#f1f5f9]">
      <MainHeader />

      <main className="mx-auto max-w-2xl px-4 pb-28 pt-24 md:px-6">
        {/* Page title */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-extrabold text-[#1b1c1a]">
              Notifications
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="mt-0.5 text-xs text-[#6b7280]">Proposals, payments and activity updates</p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="mt-1 flex-shrink-0 rounded-full border border-[#d6dce3] bg-white px-3 py-1.5 text-xs font-bold text-[#005d8f] transition hover:bg-[#edf5fb]"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="mb-4 flex gap-2">
          {(['all', 'unread'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
                filter === f
                  ? 'bg-[#005d8f] text-white shadow-sm'
                  : 'border border-[#d6dce3] bg-white text-[#6b7280] hover:border-[#005d8f] hover:text-[#005d8f]'
              }`}
            >
              {f === 'all'
                ? `All${notifications.length > 0 ? ` (${notifications.length})` : ''}`
                : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
            </button>
          ))}
        </div>

        {/* Notifications list */}
        <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
          {loading ? (
            <div className="py-10 text-center text-sm text-[#6b7280]">Loading…</div>
          ) : visible.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-4xl">🔔</p>
              <p className="mt-3 font-bold text-[#1b1c1a]">
                {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
              </p>
              <p className="mt-1 text-sm text-[#6b7280]">
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
      </main>
    </div>
  )
}
