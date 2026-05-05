export const metadata = { title: 'Terms & Conditions — Xwite' }

const TERMS = [
  'Xwite is a platform connecting clients with independent freelancers.',
  'Xwite does not directly provide the services listed on the platform.',
  'Users are responsible for the accuracy of the information they provide.',
  'Payments are securely processed via third-party payment providers.',
  'Xwite may charge a service fee or commission on transactions.',
  'Any fraud, misuse, or policy violation may result in account suspension.',
]

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      {/* Hero */}
      <div className="mb-12 text-center">
        <span className="inline-block rounded-full bg-[#F3E5F5] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#6A1B9A] mb-4">
          Legal
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-[#1b1c1a]">Terms &amp; Conditions</h1>
        <p className="mt-4 text-base text-[#5a6470] max-w-xl mx-auto leading-relaxed">
          By using Xwite, you agree to the following terms. Please read them carefully before using our platform.
        </p>
      </div>

      {/* Terms list */}
      <div className="rounded-2xl border border-[#e3e2df] bg-white p-8 shadow-sm mb-6">
        <ul className="space-y-4">
          {TERMS.map((term, i) => (
            <li key={i} className="flex items-start gap-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1565C0] text-white text-[10px] font-extrabold mt-0.5">
                {i + 1}
              </span>
              <p className="text-sm text-[#404850] leading-relaxed">{term}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl bg-[#F3E5F5] border border-[#CE93D8] p-5 text-sm text-[#4A148C] leading-relaxed">
        Xwite reserves the right to update these terms at any time. Continued use of the platform after any changes
        constitutes acceptance of the updated terms.
      </div>
    </div>
  )
}
