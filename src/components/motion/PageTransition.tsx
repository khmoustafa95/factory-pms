import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const location = useLocation()

  return (
    <div key={location.pathname} className={cn('motion-page-enter', className)}>
      {children}
    </div>
  )
}
