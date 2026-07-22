import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FadeInProps {
  children: ReactNode
  className?: string
  delayMs?: number
}

export function FadeIn({ children, className, delayMs = 0 }: FadeInProps) {
  return (
    <div
      className={cn('motion-fade-in', className)}
      style={delayMs > 0 ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  )
}
