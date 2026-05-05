export default function VerifiedBadge({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const px = size === 'sm' ? 16 : size === 'lg' ? 22 : 18
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Verified"
      className="inline-block shrink-0"
    >
      {/* soft outer ring for depth */}
      <circle cx="12" cy="12" r="12" fill="#1565C0" fillOpacity="0.12" />
      {/* main filled circle */}
      <circle cx="12" cy="12" r="9.5" fill="#1565C0" />
      {/* inner highlight arc */}
      <circle cx="12" cy="12" r="9.5" stroke="white" strokeOpacity="0.18" strokeWidth="1" fill="none" />
      {/* checkmark */}
      <path
        d="M7.8 12.4L10.6 15.2L16.2 9.2"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
