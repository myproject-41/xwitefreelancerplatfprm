import type { SVGProps } from 'react'

export default function VerifiedBadge({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
  const props: SVGProps<SVGSVGElement> = {
    viewBox: '0 0 24 24',
    className: `${sz} shrink-0 text-[#1565C0]`,
    'aria-label': 'Verified',
  }
  return (
    <svg {...props}>
      <circle cx="12" cy="12" r="12" fill="currentColor" />
      <path d="M9.5 16.5 5.5 12.5l1.41-1.41L9.5 13.67l7.59-7.59L18.5 7.5z" fill="white" />
    </svg>
  )
}
