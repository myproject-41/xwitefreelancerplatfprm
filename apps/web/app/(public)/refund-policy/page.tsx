export const metadata = { title: 'Refund & Cancellation Policy — Xwite' }

export default function RefundPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      {/* Hero */}
      <div className="mb-12 text-center">
        <span className="inline-block rounded-full bg-[#FFF8E1] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#F57F17] mb-4">
          Policy
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-[#1b1c1a]">Refund &amp; Cancellation Policy</h1>
        <p className="mt-4 text-base text-[#5a6470] max-w-xl mx-auto leading-relaxed">
          At Xwite, we aim to ensure fair and secure transactions for both clients and freelancers.
        </p>
      </div>

      <div className="space-y-6">
        {/* Cancellation */}
        <section className="rounded-2xl border border-[#e3e2df] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#1b1c1a] mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E3F2FD] text-[#0160B9] text-sm font-extrabold">1</span>
            Cancellation
          </h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#0160B9]" />
              <p className="text-sm text-[#404850] leading-relaxed">
                Clients may cancel a project <strong>before work begins</strong> and receive a full refund.
              </p>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#0160B9]" />
              <p className="text-sm text-[#404850] leading-relaxed">
                If work has started, cancellation will be reviewed based on the progress made.
              </p>
            </li>
          </ul>
        </section>

        {/* Refund */}
        <section className="rounded-2xl border border-[#e3e2df] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#1b1c1a] mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E3F2FD] text-[#0160B9] text-sm font-extrabold">2</span>
            Refund Policy
          </h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#0160B9]" />
              <p className="text-sm text-[#404850] leading-relaxed">
                Refunds are issued if the freelancer <strong>fails to deliver</strong> the agreed service.
              </p>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#e53935]" />
              <p className="text-sm text-[#404850] leading-relaxed">
                <strong>No refund</strong> will be issued after the client approves the final work.
              </p>
            </li>
          </ul>
        </section>

        {/* Processing Time */}
        <section className="rounded-2xl border border-[#e3e2df] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#1b1c1a] mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E3F2FD] text-[#0160B9] text-sm font-extrabold">3</span>
            Processing Time
          </h2>
          <p className="text-sm text-[#404850] leading-relaxed">
            Approved refunds are processed within <strong>5–7 business days</strong> to the original payment method.
          </p>
        </section>

        {/* Note */}
        <div className="rounded-2xl bg-[#FFF8E1] border border-[#FFE082] p-5 text-sm text-[#7B4F00] leading-relaxed">
          Xwite reserves the right to review disputes and make final decisions regarding refunds and cancellations.
        </div>
      </div>
    </div>
  )
}
