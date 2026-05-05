import Link from 'next/link'

const PLATFORM = [
  { label: 'Home', href: '/' },
  { label: 'Network', href: '/network' },
  { label: 'Login', href: '/login' },
  { label: 'Join Free', href: '/signup' },
]

const COMPANY = [
  { label: 'About Us', href: '/about' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Contact Us', href: '/contact' },
]

const LEGAL = [
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Refund Policy', href: '/refund-policy' },
]

export default function SiteFooter() {
  return (
    <footer className="bg-[#0D1B2A] text-white">
      <div className="mx-auto max-w-screen-xl px-6 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Brand */}
        <div>
          <Link href="/" className="inline-block mb-4">
            <img src="/xwiteprofile.png" alt="Xwite" className="h-12 w-12 rounded-xl object-cover" />
          </Link>
          <p className="text-sm text-white/60 leading-relaxed max-w-[200px]">
            Build, collaborate, and ship real projects together.
          </p>
          <p className="mt-4 text-xs text-white/40">
            © {new Date().getFullYear()} Xwite. All rights reserved.
          </p>
        </div>

        {/* Platform */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Platform</h4>
          <ul className="space-y-3">
            {PLATFORM.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-white/70 hover:text-white transition">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Company */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Company</h4>
          <ul className="space-y-3">
            {COMPANY.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-white/70 hover:text-white transition">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Legal + Contact */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Legal</h4>
          <ul className="space-y-3 mb-6">
            {LEGAL.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-white/70 hover:text-white transition">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Contact</h4>
          <p className="text-sm text-white/60">xwitesupport@gmail.com</p>
          <p className="text-sm text-white/60 mt-1">+91 8936018968</p>
          <p className="text-sm text-white/60 mt-1">Bihar, India</p>
        </div>
      </div>

      <div className="border-t border-white/10 px-6 py-4 text-center">
        <p className="text-xs text-white/30">
          Xwite — A freelance marketplace for fast, secure project delivery. Founded by Abhishek Anand, Bihar, India.
        </p>
      </div>
    </footer>
  )
}
