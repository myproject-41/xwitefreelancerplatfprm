'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { chatService } from '../../services/chat.service'
import { notificationService } from '../../services/notification.service'
import { useAuthStore } from '../../store/authStore'
import { useFeedStore } from '../../store/feedStore'

const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Network', href: '/network' },
  { label: 'Post', href: '/post' },
  { label: 'Alerts', href: '/alerts' },
  { label: 'Profile', href: '/profile' },
]

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M13 2 5 13h5l-1 9 8-11h-5l1-9Z" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="m12 2 1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2Z" />
    </svg>
  )
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M5 6.5h14v9H9l-4 3v-12Z" />
    </svg>
  )
}

export default function MainHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [messageUnreadCount, setMessageUnreadCount] = useState(0)
  const [alertUnreadCount, setAlertUnreadCount] = useState(0)
  const search = useFeedStore((state) => state.search)
  const setSearch = useFeedStore((state) => state.setSearch)

  useEffect(() => {
    if (!user) {
      setMessageUnreadCount(0)
      setAlertUnreadCount(0)
      return
    }

    let ignore = false

    async function loadCounts() {
      try {
        const [conversationRes, alertRes] = await Promise.all([
          chatService.getConversations(),
          notificationService.getNotifications(),
        ])

        if (ignore) return

        const conversations = conversationRes?.data ?? []
        const alerts = alertRes?.data ?? []

        setMessageUnreadCount(
          conversations.reduce((sum: number, item: any) => sum + (item.unreadCount ?? 0), 0)
        )
        setAlertUnreadCount(
          alerts.filter((item: any) => !item.isRead).length
        )
      } catch {
        if (!ignore) {
          setMessageUnreadCount(0)
          setAlertUnreadCount(0)
        }
      }
    }

    void loadCounts()

    return () => {
      ignore = true
    }
  }, [pathname, user])

  const getBadgeCount = (href: string) => {
    if (href === '/alerts') return alertUnreadCount
    if (href === '/messages') return messageUnreadCount
    return 0
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (pathname !== '/') {
      router.push('/')
    }
  }

  return (
    <header className="fixed top-0 z-50 w-full border-b border-zinc-200/30 bg-white/90 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" className="flex items-center">
          <img src="/logo.png" alt="Xwite" className="h-9 w-9 rounded-xl object-cover" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href
            const requiresAuth = item.label === 'Post' || item.label === 'Alerts' || item.label === 'Profile'
            const href = requiresAuth && !user ? '/login' : item.href

            return (
              <Link
                key={item.href}
                href={href}
                className={`relative pb-1 text-sm transition ${
                  isActive ? 'font-bold text-[#0160B9]' : 'font-medium text-[#6b7280] hover:text-[#0160B9]'
                }`}
              >
                {item.label}
                {user && getBadgeCount(item.href) ? (
                  <span className="ml-2 rounded-full bg-[#0160B9] px-2 py-0.5 text-[10px] font-bold text-white">
                    {getBadgeCount(item.href)}
                  </span>
                ) : null}
                {isActive ? (
                  <span className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-[#0160B9]" />
                ) : null}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-3">
          <label className="relative flex md:hidden">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#707881]">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search home"
              className="w-36 rounded-full bg-[#e9e8e5] py-2 pl-9 pr-4 text-sm text-[#1b1c1a] outline-none transition placeholder:text-[#707881] focus:bg-white focus:ring-2 focus:ring-[#0160B9]/20"
            />
          </label>

          <label className="relative hidden md:flex">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#707881]">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search home, skills, people..."
              className="w-56 rounded-full bg-[#e9e8e5] py-2 pl-9 pr-4 text-sm text-[#1b1c1a] outline-none transition placeholder:text-[#707881] focus:bg-white focus:ring-2 focus:ring-[#0160B9]/20"
            />
          </label>

          {user ? (
            <>
              <Link
                href="/agent"
                className="inline-flex items-center gap-2 rounded-full bg-[#0160B9] px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:opacity-90 active:scale-95"
              >
                <SparkIcon />
                <span className="hidden sm:inline">AI Agent</span>
              </Link>

              <Link
                href="/messages"
                aria-label="Messages"
                className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#0160B9]/20 bg-white text-[#0160B9] transition-all duration-150 hover:bg-[#E3F2FD] active:scale-95"
              >
                <MessageIcon />
                {messageUnreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[#0160B9] px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">
                    {messageUnreadCount}
                  </span>
                ) : null}
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-bold text-[#0160B9] hover:underline"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-[#0160B9] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#0160B9] transition active:scale-95"
              >
                Join Free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
