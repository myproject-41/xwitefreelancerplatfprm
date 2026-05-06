export const metadata = { title: 'How Xwite Works' }

const STEPS = [
  {
    n: 1,
    title: 'Post or Choose a Service',
    body: 'Clients can post project requirements or browse freelancer services to find exactly what they need.',
  },
  {
    n: 2,
    title: 'Hire a Freelancer',
    body: 'Clients select freelancers based on skills, pricing, and reviews to ensure the best fit for their project.',
  },
  {
    n: 3,
    title: 'Secure Payment',
    body: 'Payments are made securely and held on the platform until work completion, protecting both parties.',
  },
  {
    n: 4,
    title: 'Work Delivery',
    body: 'Freelancers deliver the project within the agreed timeline, keeping clients updated throughout.',
  },
  {
    n: 5,
    title: 'Approval & Payment Release',
    body: 'Once the client approves the work, payment is released to the freelancer instantly.',
  },
]

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      {/* Hero */}
      <div className="mb-12 text-center">
        <span className="inline-block rounded-full bg-[#E3F2FD] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#0160B9] mb-4">
          Services
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-[#1b1c1a]">How Xwite Works</h1>
        <p className="mt-4 text-base text-[#5a6470] max-w-xl mx-auto leading-relaxed">
          Xwite is a freelance marketplace that connects clients with skilled professionals for services like design,
          development, writing, and more.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-5">
        {STEPS.map((step) => (
          <div
            key={step.n}
            className="flex items-start gap-5 rounded-2xl border border-[#e3e2df] bg-white p-6 shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0160B9] text-white font-extrabold text-sm shadow-md">
              {step.n}
            </div>
            <div>
              <h2 className="font-bold text-[#1b1c1a] text-base mb-1">{step.title}</h2>
              <p className="text-sm text-[#5a6470] leading-relaxed">{step.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-10 rounded-2xl bg-[#E3F2FD] border border-[#BBDEFB] p-6 text-center">
        <p className="text-sm font-semibold text-[#0160B9]">
          Xwite ensures a transparent and secure collaboration environment.
        </p>
      </div>
    </div>
  )
}
