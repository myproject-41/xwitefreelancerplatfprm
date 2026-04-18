'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { chatService } from '../../../services/chat.service'

type ConversationItem = {
  conversationId: string
  unreadCount: number
  lastMessage: string | null
  lastMessageAt: string | null
  participant: {
    id: string
    name: string
    title?: string | null
    profileImage?: string | null
  } | null
}

function formatLastMessage(msg: string | null) {
  if (!msg) return 'Start the conversation'
  if (msg.startsWith('{')) {
    try {
      const p = JSON.parse(msg)
      if (p.__type === 'PROPOSAL') return `Proposal: "${p.postTitle}"`
    } catch {}
  }
  return msg
}

function formatTime(date?: string | null) {
  if (!date) return ''
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
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

export default function MessagesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<ConversationItem[]>([])

  useEffect(() => {
    let ignore = false

    async function loadConversations() {
      try {
        const res = await chatService.getConversations()
        if (!ignore) {
          setConversations(res?.data ?? [])
        }
      } catch (error: any) {
        if (!ignore) {
          toast.error(error?.response?.data?.message || 'Failed to load messages')
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    void loadConversations()

    return () => {
      ignore = true
    }
  }, [])

  const highlightConversationId = searchParams.get('conversationId') // kept for backwards-compat deep links

  const unreadCount = useMemo(
    () => conversations.reduce((sum, item) => sum + item.unreadCount, 0),
    [conversations]
  )

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#faf9f6_0%,#f3f4ef_100%)] px-4 pb-24 pt-24 text-[#1b1c1a] md:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#707881]">Messages</p>
            <h1 className="mt-2 text-3xl font-extrabold text-[#005d8f]">Conversation history</h1>
            <p className="mt-2 text-sm text-[#5a6470]">
              {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'Open any conversation to continue chatting'}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-[#e4e7eb] bg-white shadow-[0_14px_40px_rgba(27,28,26,0.06)]">
          {loading ? (
            <div className="p-10 text-center text-sm text-[#5a6470]">Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-lg font-bold text-[#1b1c1a]">No conversations yet</p>
              <p className="mt-2 text-sm text-[#5a6470]">When someone connects or responds to a post, the conversation will show up here.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#edf0f3]">
              {conversations.map((conversation) => {
                const isHighlighted = highlightConversationId === conversation.conversationId
                return (
                  <button
                    key={conversation.conversationId}
                    type="button"
                    onClick={() => router.push(`/messages/${conversation.conversationId}`)}
                    className={`flex w-full items-center gap-4 p-5 text-left transition hover:bg-[#fbfcfd] ${
                      isHighlighted ? 'bg-[#f5fbff]' : 'bg-white'
                    }`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#e8f1f8] text-sm font-bold text-[#005d8f]">
                      {conversation.participant?.profileImage ? (
                        <img
                          src={conversation.participant.profileImage}
                          alt={conversation.participant.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getInitials(conversation.participant?.name)
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-extrabold text-[#1b1c1a]">
                          {conversation.participant?.name ?? 'Conversation'}
                        </p>
                        <span className="text-xs font-semibold text-[#707881]">
                          {formatTime(conversation.lastMessageAt)}
                        </span>
                      </div>
                      <p className="truncate text-xs text-[#707881]">
                        {conversation.participant?.title || 'Xwite member'}
                      </p>
                      <p className="mt-1 truncate text-sm text-[#4d5661]">
                        {formatLastMessage(conversation.lastMessage)}
                      </p>
                    </div>

                    {conversation.unreadCount > 0 ? (
                      <span className="rounded-full bg-[#0077b5] px-2.5 py-1 text-xs font-bold text-white">
                        {conversation.unreadCount}
                      </span>
                    ) : (
                      <span className="rounded-full border border-[#d6dce3] px-3 py-1.5 text-xs font-bold text-[#005d8f]">
                        Open
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
