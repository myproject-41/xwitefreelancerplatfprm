'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#faf9f6_0%,#f3f4ef_100%)] flex items-center justify-center px-6 py-16">
      <div className="mx-auto w-full max-w-lg text-center">
        <div className="mb-6">
          <p className="text-6xl font-extrabold text-[#e53935]">⚠️</p>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#1b1c1a] mb-2">
          Something went wrong
        </h1>
        <p className="text-base text-[#5a6470] mb-8 leading-relaxed">
          We encountered an unexpected error. Please try again or contact support if the problem persists.
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
        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mt-8 rounded-lg bg-red-50 border border-red-200 p-4 text-left">
            <p className="text-xs font-mono text-red-700 break-words">{error.message}</p>
          </div>
        )}
      </div>
    </div>
  )
}
