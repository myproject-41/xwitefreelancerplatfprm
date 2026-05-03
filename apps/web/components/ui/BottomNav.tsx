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
]

function HomeIcon({ active = false }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M19 12L12 5L5 12V20H9V14H15V20H19V12Z" />
    </svg>
  )
}

function NetworkIcon({ active = false }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" />
      <circle cx="9" cy="7" r="4" fill={active ? 'currentColor' : 'none'} />
      <path d="M23 21V19C22.9993 18.1137 22.7044 17.2522 22.1614 16.5523C21.6184 15.8524 20.8581 15.3516 20 15.13" />
      <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11768 19.0078 7.005C19.0078 7.89232 18.7122 8.75608 18.1676 9.45768C17.623 10.1593 16.8604 10.6597 16 10.88" />
    </svg>
  )
}

function BellIcon({ active = false }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path fill={active ? 'currentColor' : 'none'} d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" />
      <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6981 21.5547 10.4458 21.3031 10.27 21" />
    </svg>
  )
}

function PostIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

function ProfileIcon({ active = false }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
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
  if (name === 'Post') return <PostIcon />
  return <PostIcon />
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

  const profilePath =
    user?.role === 'FREELANCER' ? '/profile/freelancer'
    : user?.role === 'COMPANY' ? '/profile/company'
    : '/profile'

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200/60 bg-white/95 backdrop-blur-md md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="mx-auto flex max-w-screen-sm">
        {NAV_ITEMS.map((item) => {
          const resolvedPath = item.label === 'Profile' ? profilePath : item.path
          const isActive = item.label === 'Profile'
            ? pathname.startsWith('/profile')
            : pathname === item.path
          const isPost = item.label === 'Post'
          const isAlerts = item.label === 'Alerts'

          return (
            <Link
              key={item.path}
              href={resolvedPath}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 transition-all duration-150 active:scale-95 ${
                isPost ? '' : isActive ? 'text-[#005d8f]' : 'text-[#9ca3af] hover:text-[#005d8f]'
              }`}
            >
              {isPost ? (
                <div className="-mt-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#005d8f] text-white shadow-[0_4px_14px_rgba(0,93,143,0.4)] transition-transform duration-150 active:scale-90">
                  <NavIcon name={item.icon} />
                </div>
              ) : (
                <>
                  <div className={`relative flex items-center justify-center rounded-2xl transition-all duration-150 ${isActive ? 'bg-[#e8f4fd] px-3 py-1' : 'px-3 py-1'}`}>
                    <NavIcon name={item.icon} active={isActive} />
                    {isAlerts && unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff4d4f] px-1 text-[9px] font-bold leading-none text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className={`text-[9px] font-semibold tracking-wide ${isActive ? 'text-[#005d8f]' : 'text-[#9ca3af]'}`}>
                    {item.label}
                  </span>
                </>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
