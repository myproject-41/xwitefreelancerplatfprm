'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { chatService } from '../../../../services/chat.service'
import { postService } from '../../../../services/post.service'
import { useAuthStore } from '../../../../store/authStore'
import { getSocketClient } from '../../../../utils/socketClient'

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageItem = {
  id: string
  content: string
  isRead: boolean
  createdAt: string
  senderId: string
  senderName: string
  senderProfileImage?: string | null
}

type ProposalPayload = {
  __type: 'PROPOSAL'
  proposalId: string
  postId: string
  postTitle: string
  coverLetter: string
  proposedRate: number | null
  freelancerId: string
  freelancerName: string
  status: string
}

type ProposalData = {
  id: string
  status: string
  proposedRate: number | null
  coverLetter: string
  postId: string
  post: { id: string; title: string; clientId: string; budget: number | null }
  freelancer: {
    id: string
    freelancerProfile?: { fullName?: string; title?: string; profileImage?: string | null; avgRating?: number | null } | null
    companyProfile?: { companyName?: string; profileImage?: string | null } | null
    clientProfile?: { fullName?: string; profileImage?: string | null } | null
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tryParseProposal(content: string): ProposalPayload | null {
  if (!content.startsWith('{')) return null
  try {
    const parsed = JSON.parse(content)
    if (parsed.__type === 'PROPOSAL') return parsed as ProposalPayload
  } catch {}
  return null
}

function formatTimestamp(date: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  }).format(new Date(date))
}

function getInitials(name?: string | null) {
  return (name || 'X')
    .split(' ')
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'X'
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#d97706',
  ACCEPTED: '#16a34a',
  REJECTED: '#dc2626',
  WITHDRAWN: '#6b7280',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending review',
  ACCEPTED: 'Accepted',
  REJECTED: 'Declined',
  WITHDRAWN: 'Withdrawn',
}

// ─── Proposal Card ────────────────────────────────────────────────────────────

function ProposalCard({
  payload,
  isOwnMessage,
  proposalData,
  onAccept,
  onReject,
  accepting,
  rejecting,
}: {
  payload: ProposalPayload
  isOwnMessage: boolean
  proposalData: ProposalData | null
  onAccept: () => void
  onReject: () => void
  accepting: boolean
  rejecting: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const status = proposalData?.status ?? payload.status
  const rate = proposalData?.proposedRate ?? payload.proposedRate
  const isActionable = !isOwnMessage && status === 'PENDING'
  const coverLetter = proposalData?.coverLetter ?? payload.coverLetter
  const isLong = coverLetter.length > 200

  return (
    <div style={{
      background: 'white',
      border: '1.5px solid #e0e7ef',
      borderRadius: 20,
      padding: '18px 20px',
      maxWidth: 460,
      boxShadow: '0 4px 16px rgba(0,93,143,0.07)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 38, height: 38, borderRadius: '50%', background: '#e8f4fd',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#005d8f', flexShrink: 0, overflow: 'hidden',
        }}>
          {payload.freelancerName ? getInitials(payload.freelancerName) : '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1b1c1a' }}>
            {payload.freelancerName}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: '#707881' }}>
            Proposal for &ldquo;{payload.postTitle}&rdquo;
          </p>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, color: STATUS_COLORS[status] || '#707881',
          background: `${STATUS_COLORS[status]}18` || '#f3f4f6',
          borderRadius: 8, padding: '3px 10px', flexShrink: 0,
        }}>
          {STATUS_LABELS[status] || status}
        </span>
      </div>

      {/* Cover letter */}
      <div style={{
        background: '#f8fafc', borderRadius: 12, padding: '12px 14px', marginBottom: 12,
        border: '1px solid #f0f3f6',
      }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#5a6470', marginBottom: 6 }}>
          Cover Letter
        </p>
        <p style={{
          margin: 0, fontSize: 13, color: '#2d3748', lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
        }}>
          {isLong && !expanded ? `${coverLetter.slice(0, 200)}…` : coverLetter}
        </p>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            style={{
              marginTop: 6, fontSize: 12, color: '#0077b5', fontWeight: 600,
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>

      {/* Rate */}
      {rate != null && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
          padding: '8px 12px', background: '#f0fdf4', borderRadius: 10,
        }}>
          <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 700 }}>
            ₹{rate.toLocaleString('en-IN')}
          </span>
          <span style={{ fontSize: 12, color: '#4b7a5a' }}>proposed rate</span>
        </div>
      )}

      {/* Actions */}
      {isActionable && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onAccept}
            disabled={accepting || rejecting}
            style={{
              flex: 1, minWidth: 100, padding: '9px 16px',
              background: 'linear-gradient(135deg,#005d8f 0%,#0077b5 100%)',
              color: 'white', border: 'none', borderRadius: 12,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              opacity: accepting || rejecting ? 0.65 : 1,
            }}
          >
            {accepting ? 'Accepting…' : 'Accept'}
          </button>
          <Link
            href={`/users/${payload.freelancerId}`}
            target="_blank"
            style={{
              flex: 1, minWidth: 100, padding: '9px 16px',
              background: '#f0f7ff', color: '#005d8f',
              border: '1.5px solid #bdd8f0', borderRadius: 12,
              fontSize: 13, fontWeight: 700, textDecoration: 'none',
              textAlign: 'center', display: 'inline-block',
            }}
          >
            View Profile
          </Link>
          <button
            type="button"
            onClick={onReject}
            disabled={accepting || rejecting}
            style={{
              flex: 1, minWidth: 100, padding: '9px 16px',
              background: '#fff0f0', color: '#dc2626',
              border: '1.5px solid #fca5a5', borderRadius: 12,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              opacity: accepting || rejecting ? 0.65 : 1,
            }}
          >
            {rejecting ? 'Declining…' : 'Decline'}
          </button>
        </div>
      )}

      {/* Post-action links */}
      {status === 'ACCEPTED' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link
            href={`/users/${payload.freelancerId}`}
            target="_blank"
            style={{
              flex: 1, padding: '9px 16px',
              background: '#f0f7ff', color: '#005d8f',
              border: '1.5px solid #bdd8f0', borderRadius: 12,
              fontSize: 13, fontWeight: 700, textDecoration: 'none',
              textAlign: 'center', display: 'inline-block',
            }}
          >
            View Profile
          </Link>
          {!isOwnMessage && (
            <Link
              href="/payment/escrow"
              style={{
                flex: 1, padding: '9px 16px',
                background: '#f0fdf4', color: '#16a34a',
                border: '1.5px solid #86efac', borderRadius: 12,
                fontSize: 13, fontWeight: 700, textDecoration: 'none',
                textAlign: 'center', display: 'inline-block',
              }}
            >
              View Escrow
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ConversationPage() {
  const params = useParams<{ conversationId: string }>()
  const router = useRouter()
  const { user } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [draft, setDraft] = useState('')
  const [proposalData, setProposalData] = useState<ProposalData | null>(null)
  const [proposalLoading, setProposalLoading] = useState(false)
  const isChatLocked = false
  const bottomRef = useRef<HTMLDivElement>(null)

  // ── helpers ──────────────────────────────────────────────────────────────────

  const pushIncomingMessage = (incoming: MessageItem) => {
    setMessages((current) => {
      if (current.some((item) => item.id === incoming.id)) return current
      return [...current, incoming]
    })
  }

  // ── load messages ──────────────────────────────────────────────────────────

  useEffect(() => {
    let ignore = false

    async function loadMessages() {
      try {
        const res = await chatService.getMessages(params.conversationId)
        if (!ignore) {
          const msgs: MessageItem[] = res?.data ?? []
          setMessages(msgs)

          // find a proposal message and fetch its live status
          const proposalMsg = msgs.find((m) => {
            const p = tryParseProposal(m.content)
            return p !== null
          })
          if (proposalMsg) {
            const payload = tryParseProposal(proposalMsg.content)!
            setProposalLoading(true)
            try {
              const pRes = await postService.getProposal(payload.proposalId)
              if (!ignore) setProposalData(pRes?.data ?? null)
            } catch {
              // ignore — card will show snapshot status
            } finally {
              if (!ignore) setProposalLoading(false)
            }
          }
        }
      } catch (error: any) {
        if (!ignore) toast.error(error?.response?.data?.message || 'Failed to load conversation')
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    void loadMessages()
    return () => { ignore = true }
  }, [params.conversationId])

  // ── socket ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const socket = getSocketClient()
    socket.emit('join', params.conversationId)

    const handleMessage = (incoming: MessageItem & { conversationId?: string }) => {
      if (incoming.conversationId !== params.conversationId) return
      pushIncomingMessage(incoming)
      if (incoming.senderId !== user?.id) {
        void chatService.markAsRead(params.conversationId)
      }
    }

    socket.on('new_message', handleMessage)
    return () => { socket.off('new_message', handleMessage) }
  }, [params.conversationId, user?.id])

  // ── scroll to bottom ──────────────────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── derived state ─────────────────────────────────────────────────────────

  const otherParticipantName = useMemo(() => {
    const other = messages.find((m) => m.senderId !== user?.id)
    return other?.senderName || 'Conversation'
  }, [messages, user?.id])

  const proposalPayload = useMemo(() => {
    for (const m of messages) {
      const p = tryParseProposal(m.content)
      if (p) return p
    }
    return null
  }, [messages])

  // ── send message ──────────────────────────────────────────────────────────

  const sendMessage = async () => {
    const content = draft.trim()
    if (!content) return

    setSending(true)
    try {
      const res = await chatService.sendMessage(params.conversationId, content)
      const created: MessageItem = res?.data ?? {
        id: crypto.randomUUID(),
        content,
        isRead: false,
        createdAt: new Date().toISOString(),
        senderId: user?.id ?? '',
        senderName:
          user?.freelancerProfile?.fullName ||
          user?.companyProfile?.companyName ||
          user?.clientProfile?.fullName ||
          user?.email || 'You',
        senderProfileImage:
          user?.freelancerProfile?.profileImage ||
          user?.companyProfile?.profileImage ||
          user?.clientProfile?.profileImage || null,
      }
      pushIncomingMessage(created)
      setDraft('')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  // ── accept / reject ────────────────────────────────────────────────────────

  const handleAccept = async () => {
    if (!proposalPayload) return
    setAccepting(true)
    try {
      const res = await postService.acceptProposal(proposalPayload.postId, proposalPayload.proposalId)
      toast.success('Proposal accepted! Escrow created.')
      // update local state
      setProposalData((prev) => prev ? { ...prev, status: 'ACCEPTED' } : prev)
      const escrowId = res?.data?.escrowId
      if (escrowId) {
        router.push(`/payment/escrow/${escrowId}`)
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to accept proposal')
    } finally {
      setAccepting(false)
    }
  }

  const handleReject = async () => {
    if (!proposalPayload) return
    setRejecting(true)
    try {
      await postService.rejectProposal(proposalPayload.postId, proposalPayload.proposalId)
      toast.success('Proposal declined.')
      setProposalData((prev) => prev ? { ...prev, status: 'REJECTED' } : prev)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to reject proposal')
    } finally {
      setRejecting(false)
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#faf9f6_0%,#f3f4ef_100%)] px-4 pb-24 pt-24 text-[#1b1c1a] md:px-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#707881]">Messages</p>
            <h1 className="mt-2 text-3xl font-extrabold text-[#005d8f]">{otherParticipantName}</h1>
          </div>
          <button
            type="button"
            onClick={() => router.push('/messages')}
            className="rounded-full border border-[#d6dce3] bg-white px-4 py-2 text-sm font-bold text-[#005d8f] transition hover:bg-[#f4f8fb]"
          >
            ← Back to inbox
          </button>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-[#e4e7eb] bg-white shadow-[0_14px_40px_rgba(27,28,26,0.06)]">
          {/* Message list */}
          <div className="max-h-[60vh] space-y-4 overflow-y-auto bg-[#fcfcfb] p-5">
            {loading ? (
              <p className="text-center text-sm text-[#5a6470]">Loading messages…</p>
            ) : messages.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-lg font-bold text-[#1b1c1a]">No messages yet</p>
                <p className="mt-2 text-sm text-[#5a6470]">Send the first message to start this conversation.</p>
              </div>
            ) : (
              messages.map((message) => {
                const isOwn = message.senderId === user?.id
                const proposalInfo = tryParseProposal(message.content)

                if (proposalInfo) {
                  return (
                    <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div>
                        {!isOwn && (
                          <div className="mb-2 flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#e8f1f8] text-[11px] font-bold text-[#005d8f]">
                              {message.senderProfileImage ? (
                                <img src={message.senderProfileImage} alt={message.senderName} className="h-full w-full object-cover" />
                              ) : (
                                getInitials(message.senderName)
                              )}
                            </div>
                            <span className="text-xs font-bold text-[#005d8f]">{message.senderName}</span>
                          </div>
                        )}
                        <ProposalCard
                          payload={proposalInfo}
                          isOwnMessage={isOwn}
                          proposalData={proposalLoading ? null : proposalData}
                          onAccept={handleAccept}
                          onReject={handleReject}
                          accepting={accepting}
                          rejecting={rejecting}
                        />
                        <p className="mt-1 text-[11px] text-[#707881]">{formatTimestamp(message.createdAt)}</p>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-[22px] px-4 py-3 shadow-sm md:max-w-[70%] ${
                        isOwn
                          ? 'bg-[linear-gradient(135deg,#005d8f_0%,#0077b5_100%)] text-white'
                          : 'border border-[#e5e7eb] bg-white text-[#1b1c1a]'
                      }`}
                    >
                      {!isOwn && (
                        <div className="mb-2 flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#e8f1f8] text-[11px] font-bold text-[#005d8f]">
                            {message.senderProfileImage ? (
                              <img src={message.senderProfileImage} alt={message.senderName} className="h-full w-full object-cover" />
                            ) : (
                              getInitials(message.senderName)
                            )}
                          </div>
                          <span className="text-xs font-bold text-[#005d8f]">{message.senderName}</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                      <p className={`mt-2 text-[11px] ${isOwn ? 'text-white/75' : 'text-[#707881]'}`}>
                        {formatTimestamp(message.createdAt)}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-[#edf0f3] bg-white p-4">
            <div className="flex flex-col gap-3 md:flex-row">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !isChatLocked) {
                    e.preventDefault()
                    void sendMessage()
                  }
                }}
                rows={3}
                disabled={isChatLocked}
                className="min-h-[96px] flex-1 resize-none rounded-2xl border border-[#d6dce3] bg-[#fafbfc] px-4 py-3 text-sm text-[#1b1c1a] outline-none transition focus:border-[#0077b5] focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Write your message here… (Enter to send, Shift+Enter for new line)"
              />

              <div className="flex flex-col gap-2 md:w-[180px]">
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={sending || !draft.trim() || isChatLocked}
                  className="rounded-2xl bg-[linear-gradient(135deg,#005d8f_0%,#0077b5_100%)] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(0,93,143,0.22)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? 'Sending…' : 'Send message'}
                </button>

                <Link
                  href="/messages"
                  className="rounded-2xl border border-[#d6dce3] px-5 py-3 text-center text-sm font-bold text-[#005d8f] transition hover:bg-[#f4f8fb]"
                >
                  View inbox
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
