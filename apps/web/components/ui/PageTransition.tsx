'use client'

import { usePathname } from 'next/navigation'

/**
 * Wraps children with a per-route fade-in animation.
 * Re-mounts on path change via the `key` prop, triggering the CSS animation.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div key={pathname} className="page-fade-in">
      {children}
    </div>
  )
}
