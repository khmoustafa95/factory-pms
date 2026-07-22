import type {
  ComponentProps,
  CSSProperties,
  ReactElement,
  ReactNode,
} from 'react'
import { Children, cloneElement, isValidElement } from 'react'
import { cn } from '@/lib/utils'

interface StaggerGroupProps extends ComponentProps<'div'> {
  children: ReactNode
  staggerMs?: number
}

type StaggerableChild = ReactElement<{
  className?: string
  style?: CSSProperties
}>

export function StaggerGroup({
  children,
  className,
  staggerMs = 60,
  ...props
}: StaggerGroupProps) {
  return (
    <div className={className} {...props}>
      {Children.map(children, (child, index) => {
        if (!isValidElement(child)) {
          return child
        }

        const element = child as StaggerableChild

        return cloneElement(element, {
          className: cn(element.props.className, 'motion-stagger-item'),
          style: {
            ...element.props.style,
            animationDelay: `${index * staggerMs}ms`,
          },
        })
      })}
    </div>
  )
}
