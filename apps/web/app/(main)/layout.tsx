import { Suspense } from 'react'
import BottomNav from '../../components/ui/BottomNav'
import FloatingChatPanel from '../../components/chat/FloatingChatPanel'
import SessionHydrator from '../../components/SessionHydrator'
import PageTransition from '../../components/ui/PageTransition'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SessionHydrator />
      <PageTransition>{children}</PageTransition>
      <Suspense fallback={null}>
        <FloatingChatPanel />
      </Suspense>
      <BottomNav />
    </>
  )
}
