'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { notificationService } from '../../services/notification.service'
import { useAuthStore } from '../../store/authStore'
import { getSocketClient } from '../../utils/socketClient'

const NAV_ITEMS = [
  { label: 'Home', icon: 'Home', path: '/' },
  { label: 'Network', icon: 'Network', path: '/network' },
  { label: 'Post', icon: 'Post', path: '/post' },
  { label: 'Alerts', icon: 'Alerts', path: '/alerts' },
  { label: 'Profile', icon: 'Profile', path: '/profile' },
  { label: 'Messages', icon: 'Messages', path: '/messages' },
]

function HomeIcon({ active = false }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M3 10.5 12 4l9 6.5V20H3v-9.5Z" />
      <path d="M9 20v-6h6v6" />
    </svg>
  )
}

function NetworkIcon({ active = false }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <circle cx="8" cy="8" r="3" fill={active ? 'currentColor' : 'none'} />
      <circle cx="16" cy="8" r="3" fill={active ? 'currentColor' : 'none'} />
      <path d="M4.5 19c0-2.5 2.2-4.5 5-4.5S14.5 16.5 14.5 19" />
      <path d="M9.5 19c0-2.2 1.9-4 4.2-4 2.4 0 4.3 1.8 4.3 4" />
    </svg>
  )
}

function BellIcon({ active = false }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M6 17h12l-1.3-1.7a4 4 0 0 1-.7-2.3V10a4 4 0 1 0-8 0v3a4 4 0 0 1-.7 2.3L6 17Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  )
}

function MessageIcon({ active = false }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M5 6.5h14v9H9l-4 3v-12Z" />
    </svg>
  )
}

function ProfileIcon({ active = false }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19c1.8-3 4.2-4.5 7-4.5S17.2 16 19 19" />
    </svg>
  )
}

function NavIcon({ name, active = false }: { name: string; active?: boolean }) {
  if (name === 'Home') return <HomeIcon active={active} />
  if (name === 'Network') return <NetworkIcon active={active} />
  if (name === 'Alerts') return <BellIcon active={active} />
  if (name === 'Profile') return <ProfileIcon active={active} />
  if (name === 'Messages') return <MessageIcon active={active} />
  return <span className="text-2xl font-bold leading-none">+</span>
}

export default function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const [unreadCount, setUnreadCount] = useState(0)

  // Load initial unread count
  useEffect(() => {
    if (!user?.id) return
    notificationService.getNotifications().then(res => {
      const list: any[] = res?.data ?? []
      setUnreadCount(list.filter((n: any) => !n.isRead).length)
    }).catch(() => {})
  }, [user?.id])

  // Real-time: increment when new notification arrives
  useEffect(() => {
    if (!user?.id) return
    const socket = getSocketClient()
    socket.emit('join_user', user.id)
    const handle = () => setUnreadCount(c => c + 1)
    socket.on('notification', handle)
    return () => { socket.off('notification', handle) }
  }, [user?.id])

  // Reset count when user visits alerts page
  useEffect(() => {
    if (pathname === '/alerts') setUnreadCount(0)
  }, [pathname])

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-white md:hidden">
      <div className="mx-auto flex max-w-screen-sm">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.path
          const isPost = item.label === 'Post'
          const isAlerts = item.label === 'Alerts'

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-3 transition-colors ${
                isPost ? '' : isActive ? 'text-[#005d8f]' : 'text-[#707881] hover:text-[#005d8f]'
              }`}
            >
              {isPost ? (
                <div className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#005d8f] text-white shadow-lg">
                  <NavIcon name={item.icon} />
                </div>
              ) : (
                <>
                  <div className="relative">
                    <NavIcon name={item.icon} active={isActive} />
                    {isAlerts && unreadCount > 0 && (
                      <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff4d4f] px-1 text-[9px] font-bold text-white leading-none">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-medium uppercase ${isActive ? 'text-[#005d8f]' : 'text-[#707881]'}`}>
                    {item.label}
                  </span>
                  {isActive ? (
                    <span className="absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#005d8f]" />
                  ) : null}
                </>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
