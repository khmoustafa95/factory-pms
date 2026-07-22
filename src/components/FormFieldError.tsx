import type { FieldError } from 'react-hook-form'

interface FormFieldErrorProps {
  error?: FieldError
}

export function FormFieldError({ error }: FormFieldErrorProps) {
  if (!error?.message) {
    return null
  }

  return <p className="text-sm text-destructive">{error.message}</p>
}
