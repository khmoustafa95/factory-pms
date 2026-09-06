import { DayPicker } from 'react-day-picker'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function Calendar({
  className,
  classNames,
  captionLayout = 'label',
  navLayout = 'around',
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      {...props}
      captionLayout={captionLayout}
      navLayout={navLayout}
      className={cn('relative p-2', className)}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(props.locale?.code, { month: 'short' }),
        ...formatters,
      }}
      classNames={{
        months: 'relative flex flex-col',
        month: 'relative flex flex-col gap-3',
        month_caption:
          'relative flex h-8 w-full items-center justify-center px-8',
        caption_label:
          captionLayout === 'label'
            ? 'text-sm font-medium'
            : 'flex h-8 items-center gap-1 text-sm font-medium',
        nav: 'pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-1',
        button_previous: cn(
          buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
          'pointer-events-auto absolute start-1 top-0 z-10',
        ),
        button_next: cn(
          buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
          'pointer-events-auto absolute end-1 top-0 z-10',
        ),
        dropdowns:
          'flex h-8 w-full items-center justify-center gap-1.5 text-sm font-medium',
        dropdown_root:
          'relative rounded-md border border-input has-focus:border-ring has-focus:ring-3 has-focus:ring-ring/50',
        dropdown: 'absolute inset-0 z-10 cursor-pointer opacity-0',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday:
          'w-8 text-center text-[0.8rem] font-normal text-muted-foreground',
        week: 'mt-1 flex',
        day: 'p-0',
        day_button: cn(
          buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
          'size-8 p-0 font-normal',
        ),
        selected:
          '[&_button]:bg-primary [&_button]:text-primary-foreground hover:[&_button]:bg-primary hover:[&_button]:text-primary-foreground',
        today: '[&_button]:bg-accent [&_button]:text-accent-foreground',
        outside: 'text-muted-foreground/50',
        disabled: 'pointer-events-none text-muted-foreground opacity-50',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({
          orientation,
          className: chevronClassName,
          disabled,
          ...chevron
        }) => {
          const Icon =
            orientation === 'left'
              ? ChevronLeft
              : orientation === 'right'
                ? ChevronRight
                : ChevronDown
          return (
            <Icon
              className={cn(
                'size-4',
                disabled && 'opacity-50',
                chevronClassName,
              )}
              {...chevron}
            />
          )
        },
        ...components,
      }}
    />
  )
}
