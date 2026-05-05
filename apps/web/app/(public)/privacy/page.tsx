export const metadata = { title: 'Privacy Policy — Xwite' }

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      {/* Hero */}
      <div className="mb-12 text-center">
        <span className="inline-block rounded-full bg-[#E8F5E9] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#1B5E20] mb-4">
          Privacy
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-[#1b1c1a]">Privacy Policy</h1>
        <p className="mt-4 text-base text-[#5a6470] max-w-xl mx-auto leading-relaxed">
          Xwite values your privacy and is committed to protecting your personal data.
        </p>
      </div>

      <div className="space-y-6">
        {/* Information Collected */}
        <section className="rounded-2xl border border-[#e3e2df] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#1b1c1a] mb-4">Information We Collect</h2>
          <ul className="space-y-2">
            {['Name, email address, and phone number', 'Transaction and payment details', 'Platform usage data and activity'].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#1565C0]" />
                <p className="text-sm text-[#404850]">{item}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Usage */}
        <section className="rounded-2xl border border-[#e3e2df] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#1b1c1a] mb-4">How We Use Your Information</h2>
          <ul className="space-y-2">
            {['To provide and continuously improve our services', 'To process secure payments on your behalf', 'To communicate with users about their accounts and activity'].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#1565C0]" />
                <p className="text-sm text-[#404850]">{item}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Data Protection */}
        <section className="rounded-2xl border border-[#e3e2df] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#1b1c1a] mb-4">Data Protection</h2>
          <ul className="space-y-2">
            {['We do not sell user data to any third party.', 'Payments are handled securely through trusted payment providers.'].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#43A047]" />
                <p className="text-sm text-[#404850]">{item}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="rounded-2xl bg-[#E8F5E9] border border-[#A5D6A7] p-5 text-sm text-[#1B5E20] leading-relaxed">
          By using Xwite, you consent to this Privacy Policy. We may update this policy from time to time and will
          notify users of significant changes.
        </div>
      </div>
    </div>
  )
}
