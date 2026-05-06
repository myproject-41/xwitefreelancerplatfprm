export const metadata = { title: 'Contact Us — Xwite' }

const DETAILS = [
  { icon: '👤', label: 'Name', value: 'Abhishek Anand' },
  { icon: '✉️', label: 'Email', value: 'xwitesupport@gmail.com', href: 'mailto:xwitesupport@gmail.com' },
  { icon: '📞', label: 'Phone', value: '+91 8936018968', href: 'tel:+918936018968' },
  { icon: '📍', label: 'Address', value: 'Near Law College, Sukhnagar, Mithapur, Bihar, India' },
]

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      {/* Hero */}
      <div className="mb-12 text-center">
        <span className="inline-block rounded-full bg-[#E3F2FD] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#0160B9] mb-4">
          Support
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-[#1b1c1a]">Contact Us</h1>
        <p className="mt-4 text-base text-[#5a6470] max-w-xl mx-auto leading-relaxed">
          For any queries or support, reach out to us directly. We aim to respond within 24–48 hours.
        </p>
      </div>

      {/* Contact cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {DETAILS.map((d) => (
          <div
            key={d.label}
            className="rounded-2xl border border-[#e3e2df] bg-white p-6 shadow-sm flex items-start gap-4"
          >
            <span className="text-2xl">{d.icon}</span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#9ca3af] mb-1">{d.label}</p>
              {d.href ? (
                <a href={d.href} className="text-sm font-semibold text-[#0160B9] hover:underline break-all">
                  {d.value}
                </a>
              ) : (
                <p className="text-sm font-semibold text-[#1b1c1a]">{d.value}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Response time note */}
      <div className="mt-8 rounded-2xl bg-[#E3F2FD] border border-[#BBDEFB] p-6 text-center">
        <p className="text-sm font-semibold text-[#0160B9]">
          We aim to respond within <strong>24–48 hours</strong> on all business days.
        </p>
      </div>
    </div>
  )
}
