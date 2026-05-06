type SkeletonProps = {
  className?: string
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
}

export function Skeleton({ className = '', rounded = 'md' }: SkeletonProps) {
  const r = {
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  }[rounded]
  return <div className={`skeleton ${r} ${className}`} aria-hidden="true" />
}

// ─── Pre-composed skeleton patterns for common layouts ──────────────────────

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
          rounded="full"
        />
      ))}
    </div>
  )
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return <Skeleton rounded="full" className="shrink-0" />
}

export function SkeletonPostCard() {
  return (
    <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton rounded="full" className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <Skeleton rounded="full" className="h-3 w-32" />
          <Skeleton rounded="full" className="h-2.5 w-24" />
        </div>
      </div>
      <div className="mb-4 space-y-2">
        <Skeleton rounded="full" className="h-3 w-3/4" />
        <Skeleton rounded="full" className="h-3 w-full" />
        <Skeleton rounded="full" className="h-3 w-2/3" />
      </div>
      <Skeleton rounded="xl" className="h-10 w-full" />
    </div>
  )
}

export function SkeletonUserCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e3e2df] bg-white shadow-sm">
      <Skeleton rounded="sm" className="h-16 w-full" />
      <div className="px-4 pt-10 pb-4">
        <Skeleton rounded="full" className="mb-2 h-4 w-32" />
        <Skeleton rounded="full" className="mb-4 h-3 w-24" />
        <div className="mb-4 flex gap-2">
          <Skeleton rounded="full" className="h-5 w-12" />
          <Skeleton rounded="full" className="h-5 w-16" />
          <Skeleton rounded="full" className="h-5 w-14" />
        </div>
        <Skeleton rounded="full" className="h-8 w-full" />
      </div>
    </div>
  )
}

export function SkeletonListItem() {
  return (
    <div className="flex items-center gap-3 rounded-lg p-3">
      <Skeleton rounded="full" className="h-11 w-11 shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton rounded="full" className="h-3 w-32" />
        <Skeleton rounded="full" className="h-2.5 w-24" />
      </div>
    </div>
  )
}
