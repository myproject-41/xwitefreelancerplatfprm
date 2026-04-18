'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { chatService } from '../../services/chat.service'
import { useAuthStore } from '../../store/authStore'
import { getSocketClient } from '../../utils/socketClient'

type MessageItem = {
  id: string
  content: string
  isRead: boolean
  createdAt: string
  senderId: string
  senderName: string
  senderProfileImage?: string | null
  conversationId?: string
}

function getInitials(name?: string | null) {
  return (name || 'Xwite')
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'X'
}

function formatTimestamp(date: string) {
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date))
}

export default function FloatingChatPanel() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useAuthStore()
  const conversationId = searchParams.get('conversationId')
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [draft, setDraft] = useState('')

  const otherParticipantName = useMemo(() => {
    const otherMessage = messages.find((message) => message.senderId !== user?.id)
    return otherMessage?.senderName || 'Conversation'
  }, [messages, user?.id])

  const updateMessages = (incoming: MessageItem) => {
    setMessages((current) => {
      if (current.some((item) => item.id === incoming.id)) {
        return current
      }
      return [...current, incoming]
    })
  }

  const closePanel = () => {
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.delete('conversationId')
    const nextQuery = nextParams.toString()
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname)
  }

  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      setDraft('')
      return
    }

    let ignore = false

    async function loadMessages() {
      setLoading(true)
      try {
        const res = await chatService.getMessages(conversationId as string)
        if (!ignore) {
          setMessages(res?.data ?? [])
        }
      } catch (error: any) {
        if (!ignore) {
          toast.error(error?.response?.data?.message || 'Failed to load conversation')
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    void loadMessages()

    return () => {
      ignore = true
    }
  }, [conversationId])

  useEffect(() => {
    if (!conversationId) return

    const socket = getSocketClient()
    socket.emit('join', conversationId)

    const handleMessage = (incoming: MessageItem) => {
      if (incoming.conversationId !== conversationId) return
      updateMessages(incoming)
      if (incoming.senderId !== user?.id) {
        void chatService.markAsRead(conversationId)
      }
    }

    socket.on('new_message', handleMessage)

    return () => {
      socket.off('new_message', handleMessage)
    }
  }, [conversationId, user?.id])

  const handleSend = async () => {
    if (!conversationId) return

    const content = draft.trim()
    if (!content) return

    setSending(true)
    try {
      const res = await chatService.sendMessage(conversationId, content)
      const createdMessage = res?.data
      if (createdMessage) {
        updateMessages(createdMessage)
      }
      setDraft('')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  if (!conversationId) return null

  return (
    <div className="fixed right-3 top-20 z-[70] w-[calc(100vw-24px)] max-w-[390px] overflow-hidden rounded-[24px] border border-[#dce3ea] bg-white shadow-[0_24px_64px_rgba(15,23,42,0.18)] md:right-6">
      <div className="flex items-center justify-between border-b border-[#edf0f3] bg-[linear-gradient(135deg,#f8fbff_0%,#eef5fb_100%)] px-4 py-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#707881]">Live Chat</p>
          <p className="mt-1 text-sm font-extrabold text-[#005d8f]">{otherParticipantName}</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/messages?conversationId=${conversationId}`}
            className="rounded-full border border-[#d6dce3] bg-white px-3 py-1.5 text-xs font-bold text-[#005d8f] transition hover:bg-[#f4f8fb]"
          >
            Inbox
          </Link>
          <button
            type="button"
            onClick={closePanel}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d6dce3] bg-white text-sm font-bold text-[#5a6470] transition hover:bg-[#f4f8fb]"
          >
            ×
          </button>
        </div>
      </div>

      <div className="max-h-[55vh] min-h-[320px] space-y-3 overflow-y-auto bg-[#fcfcfb] p-4">
        {loading ? (
          <p className="pt-16 text-center text-sm text-[#5a6470]">Loading messages...</p>
        ) : messages.length === 0 ? (
          <div className="pt-16 text-center">
            <p className="text-sm font-bold text-[#1b1c1a]">No messages yet</p>
            <p className="mt-2 text-xs text-[#5a6470]">This conversation will appear here in real time.</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.senderId === user?.id
            return (
              <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-[20px] px-3.5 py-3 text-sm shadow-sm ${
                    isOwn
                      ? 'bg-[linear-gradient(135deg,#005d8f_0%,#0077b5_100%)] text-white'
                      : 'border border-[#e5e7eb] bg-white text-[#1b1c1a]'
                  }`}
                >
                  {!isOwn ? (
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[#e8f1f8] text-[10px] font-bold text-[#005d8f]">
                        {message.senderProfileImage ? (
                          <img src={message.senderProfileImage} alt={message.senderName} className="h-full w-full object-cover" />
                        ) : (
                          getInitials(message.senderName)
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-[#005d8f]">{message.senderName}</span>
                    </div>
                  ) : null}

                  <p className="whitespace-pre-wrap leading-6">{message.content}</p>
                  <p className={`mt-2 text-[11px] ${isOwn ? 'text-white/75' : 'text-[#707881]'}`}>
                    {formatTimestamp(message.createdAt)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="border-t border-[#edf0f3] bg-white p-4">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          className="min-h-[92px] w-full resize-none rounded-2xl border border-[#d6dce3] bg-[#fafbfc] px-4 py-3 text-sm text-[#1b1c1a] outline-none transition focus:border-[#0077b5] focus:bg-white"
          placeholder="Write your message here..."
        />

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-[#707881]">Replies appear here in real time.</p>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || !draft.trim()}
            className="rounded-2xl bg-[linear-gradient(135deg,#005d8f_0%,#0077b5_100%)] px-5 py-2.5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(0,93,143,0.22)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
