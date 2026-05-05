import Link from 'next/link'

export const metadata = { title: 'About Xwite' }

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      {/* Hero */}
      <div className="mb-12 text-center">
        <img
          src="/logo.png"
          alt="Xwite"
          className="mx-auto h-20 w-20 rounded-2xl object-cover shadow-lg mb-6"
        />
        <h1 className="text-4xl font-extrabold tracking-tight text-[#1b1c1a]">About Xwite</h1>
        <p className="mt-4 text-base text-[#5a6470] max-w-xl mx-auto leading-relaxed">
          A modern freelance marketplace designed to help people collaborate and build real projects together.
        </p>
      </div>

      {/* Mission */}
      <div className="rounded-2xl border border-[#e3e2df] bg-white p-8 shadow-sm mb-6">
        <h2 className="text-xl font-bold text-[#1b1c1a] mb-3">Our Mission</h2>
        <p className="text-sm text-[#5a6470] leading-relaxed">
          Our mission is to connect clients with talented freelancers and make project collaboration simple, fast, and
          secure. We provide a trusted platform where users can hire professionals, manage projects, and complete work
          efficiently.
        </p>
      </div>

      {/* What we provide */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        {[
          { title: 'Hire Professionals', body: 'Browse and hire skilled freelancers across design, development, writing, and more.' },
          { title: 'Manage Projects', body: 'Track progress, communicate securely, and keep every project on schedule.' },
          { title: 'Secure Payments', body: 'Funds are held safely until work is approved, protecting both parties at all times.' },
        ].map((card) => (
          <div key={card.title} className="rounded-2xl border border-[#e3e2df] bg-white p-5 shadow-sm text-center">
            <h3 className="font-bold text-sm text-[#1b1c1a] mb-2">{card.title}</h3>
            <p className="text-xs text-[#5a6470] leading-relaxed">{card.body}</p>
          </div>
        ))}
      </div>

      {/* Founder */}
      <div className="rounded-2xl bg-gradient-to-br from-[#1565C0] to-[#1976D2] text-white p-8 shadow-md mb-6">
        <p className="text-sm font-bold uppercase tracking-widest text-white/60 mb-2">Founder</p>
        <h2 className="text-xl font-extrabold mb-1">Abhishek Anand</h2>
        <p className="text-white/80 text-sm leading-relaxed">
          Based in Bihar, India — committed to empowering freelancers and helping businesses grow through technology.
        </p>
      </div>

      <div className="text-center mt-8 space-y-3">
        <p className="text-sm text-[#5a6470]">Ready to get started?</p>
        <div className="flex justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-full bg-[#1565C0] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#0D47A1] transition active:scale-95"
          >
            Join Free
          </Link>
          <Link
            href="/how-it-works"
            className="rounded-full border border-[#bfc7d1] px-6 py-2.5 text-sm font-bold text-[#404850] hover:bg-[#f4f3f0] transition active:scale-95"
          >
            How It Works
          </Link>
        </div>
      </div>
    </div>
  )
}
