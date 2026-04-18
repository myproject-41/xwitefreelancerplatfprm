import BottomNav from '../../components/ui/BottomNav'
import FloatingChatPanel from '../../components/chat/FloatingChatPanel'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FloatingChatPanel />
      <BottomNav />
    </>
  )
}
