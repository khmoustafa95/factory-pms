import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Factory } from '@/types/database'
import {
  factoryFormSchema,
  type FactoryFormValues,
} from '@/lib/validations/factory'

interface FactoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  factory?: Factory | null
  onSubmit: (values: FactoryFormValues) => Promise<void>
  isSubmitting: boolean
}

export function FactoryFormDialog({
  open,
  onOpenChange,
  factory,
  onSubmit,
  isSubmitting,
}: FactoryFormDialogProps) {
  const form = useForm<FactoryFormValues>({
    resolver: zodResolver(factoryFormSchema),
    defaultValues: {
      name: '',
      code: '',
      location: '',
      is_active: true,
    },
  })

  useEffect(() => {
    if (!open) {
      return
    }

    form.reset({
      name: factory?.name ?? '',
      code: factory?.code ?? '',
      location: factory?.location ?? '',
      is_active: factory?.is_active ?? true,
    })
  }, [factory, form, open])

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values)
    onOpenChange(false)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{factory ? 'Edit factory' : 'Add factory'}</DialogTitle>
          <DialogDescription>
            Factories group projects and scope factory managers.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="factory-name">Name</Label>
            <Input id="factory-name" {...form.register('name')} />
            {form.formState.errors.name ? (
              <p className="text-sm text-red-600">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="factory-code">Code</Label>
            <Input
              id="factory-code"
              className="uppercase"
              {...form.register('code')}
            />
            {form.formState.errors.code ? (
              <p className="text-sm text-red-600">
                {form.formState.errors.code.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="factory-location">Location</Label>
            <Input id="factory-location" {...form.register('location')} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register('is_active')} />
            Active
          </label>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : factory ? 'Save changes' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
