import { useEffect } from 'react'
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Resolver,
} from 'react-hook-form'

type UseFormDialogOptions<T extends FieldValues> = {
  open: boolean
  resolver: Resolver<T>
  defaultValues: DefaultValues<T>
  getValues: () => T
  resetDependencies?: unknown[]
}

export function useFormDialog<T extends FieldValues>({
  open,
  resolver,
  defaultValues,
  getValues,
  resetDependencies = [],
}: UseFormDialogOptions<T>) {
  const form = useForm<T>({
    resolver,
    defaultValues,
  })

  useEffect(() => {
    if (!open) {
      return
    }

    form.reset(getValues())
    // Reset when the dialog opens or when entity-specific deps change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, open, ...resetDependencies])

  const createSubmitHandler = (
    onSubmit: (values: T) => Promise<void>,
    onSuccess?: () => void,
  ) => {
    return form.handleSubmit(async (values) => {
      await onSubmit(values)
      onSuccess?.()
    })
  }

  return { form, createSubmitHandler }
}
