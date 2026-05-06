'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import SiteFooter from '../../components/ui/SiteFooter'

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Page error:', error)
  }, [error])

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200/40 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between gap-4 px-6">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Xwite" className="h-9 w-9 rounded-xl object-cover" />
            <span className="font-extrabold text-[#1b1c1a] text-lg tracking-tight">Xwite</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-bold text-[#0160B9] hover:underline">
              Login
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-[#0160B9] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#0160B9] transition active:scale-95"
            >
              Join Free
            </Link>
          </div>
        </div>
      </header>

      <main className="min-h-screen bg-[#faf9f6] flex items-center justify-center px-6 py-16">
        <div className="mx-auto w-full max-w-lg text-center">
          <div className="mb-6">
            <p className="text-6xl font-extrabold text-[#e53935]">⚠️</p>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1b1c1a] mb-2">
            Something went wrong
          </h1>
          <p className="text-base text-[#5a6470] mb-8 leading-relaxed">
            We encountered an unexpected error on this page. Please try again or go back home.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center rounded-full bg-[#0160B9] px-8 py-3 text-sm font-bold text-white hover:bg-[#0160B9] transition active:scale-95"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-[#bfc7d1] bg-white px-8 py-3 text-sm font-bold text-[#404850] hover:bg-[#f7f7f5] transition active:scale-95"
            >
              Go Home
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}
