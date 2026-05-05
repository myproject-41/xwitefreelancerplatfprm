import Link from 'next/link'

export const metadata = { title: '404 Not Found — Xwite' }

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#faf9f6_0%,#f3f4ef_100%)] flex items-center justify-center px-6 py-16">
      <div className="mx-auto w-full max-w-lg text-center">
        <div className="mb-6">
          <p className="text-6xl font-extrabold text-[#1565C0]">404</p>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#1b1c1a] mb-2">
          Page not found
        </h1>
        <p className="text-base text-[#5a6470] mb-8 leading-relaxed">
          The page you're looking for doesn't exist. It may have been moved or deleted.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-[#1565C0] px-8 py-3 text-sm font-bold text-white hover:bg-[#0D47A1] transition active:scale-95"
          >
            Go Home
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-full border border-[#bfc7d1] bg-white px-8 py-3 text-sm font-bold text-[#404850] hover:bg-[#f7f7f5] transition active:scale-95"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  )
}
