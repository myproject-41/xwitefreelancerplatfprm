import { Suspense } from 'react'
import BottomNav from '../../components/ui/BottomNav'
import FloatingChatPanel from '../../components/chat/FloatingChatPanel'
import SessionHydrator from '../../components/SessionHydrator'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SessionHydrator />
      {children}
      <Suspense fallback={null}>
        <FloatingChatPanel />
      </Suspense>
      <BottomNav />
    </>
  )
}
