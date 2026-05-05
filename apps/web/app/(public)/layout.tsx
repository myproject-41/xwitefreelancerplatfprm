import Link from 'next/link'
import SiteFooter from '../../components/ui/SiteFooter'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200/40 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between gap-4 px-6">
          <Link href="/" className="flex items-center gap-2">
            <img src="/xwiteprofile.png" alt="Xwite" className="h-9 w-9 rounded-xl object-cover" />
            <span className="font-extrabold text-[#1b1c1a] text-lg tracking-tight">Xwite</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-bold text-[#1565C0] hover:underline">
              Login
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-[#1565C0] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#0D47A1] transition active:scale-95"
            >
              Join Free
            </Link>
          </div>
        </div>
      </header>

      <main className="min-h-screen bg-[#faf9f6]">
        {children}
      </main>

      <SiteFooter />
    </>
  )
}
