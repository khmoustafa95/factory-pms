import { lazy, Suspense, useState } from 'react'
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'
import { ar, enUS } from 'date-fns/locale'
import { CalendarIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from '@/contexts/LocaleContext'
import { formatDateOnly, parseDateOnly } from '@/lib/date-only'
import { formatLocalizedDate } from '@/lib/i18n-format'
import { cn } from '@/lib/utils'

const Calendar = lazy(async () => {
  const module = await import('@/components/ui/calendar')
  return { default: module.Calendar }
})

export type DatePickerProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  disabled?: boolean
  placeholder?: string
  allowClear?: boolean
  'aria-invalid'?: boolean
}

export function DatePicker({
  id,
  value,
  onChange,
  min,
  max,
  disabled,
  placeholder,
  allowClear = false,
  'aria-invalid': ariaInvalid,
}: DatePickerProps) {
  const { t, locale, dir } = useTranslation()
  const [open, setOpen] = useState(false)
  const selected = value ? parseDateOnly(value) : undefined
  const minDate = min ? parseDateOnly(min) : undefined
  const maxDate = max ? parseDateOnly(max) : undefined

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <div className="relative">
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={ariaInvalid}
            className={cn(
              'w-full justify-start font-normal',
              allowClear && value ? 'pe-9' : null,
              !value && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="size-4" />
            {selected
              ? formatLocalizedDate(value, locale)
              : (placeholder ?? t('datePicker.placeholder'))}
          </Button>
        </PopoverTrigger>
        {allowClear && value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute inset-e-1 top-1/2 size-6 -translate-y-1/2 text-muted-foreground"
            disabled={disabled}
            aria-label={t('datePicker.clear')}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onChange('')
            }}
          >
            <X className="size-3.5" />
          </Button>
        ) : null}
      </div>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        {open ? (
          <Suspense fallback={<Skeleton className="h-72 w-64" />}>
            <Calendar
              mode="single"
              dir={dir}
              locale={locale === 'ar' ? ar : enUS}
              selected={selected}
              defaultMonth={selected}
              disabled={[
                ...(minDate ? [{ before: minDate }] : []),
                ...(maxDate ? [{ after: maxDate }] : []),
              ]}
              onSelect={(date) => {
                onChange(date ? formatDateOnly(date) : '')
                setOpen(false)
              }}
            />
          </Suspense>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

export function DatePickerField<T extends FieldValues>({
  control,
  name,
  ...picker
}: {
  control: Control<T>
  name: FieldPath<T>
} & Omit<DatePickerProps, 'value' | 'onChange'>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <DatePicker
          {...picker}
          value={typeof field.value === 'string' ? field.value : ''}
          onChange={field.onChange}
          aria-invalid={fieldState.invalid || undefined}
        />
      )}
    />
  )
}
