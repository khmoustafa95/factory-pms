import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PHASE_STATUS_LABELS } from '@/lib/phase-status'
import { phaseFormSchema, type PhaseFormValues } from '@/lib/validations/phase'
import type { Phase, PhaseStatus } from '@/types/database'

interface PhaseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  phase?: Phase | null
  remainingWeight: number
  onSubmit: (values: PhaseFormValues) => Promise<void>
  isSubmitting: boolean
}

export function PhaseFormDialog({
  open,
  onOpenChange,
  phase,
  remainingWeight,
  onSubmit,
  isSubmitting,
}: PhaseFormDialogProps) {
  const form = useForm<PhaseFormValues>({
    resolver: zodResolver(phaseFormSchema),
    defaultValues: {
      name: '',
      description: '',
      weight_percent: 0,
      status: 'pending',
    },
  })

  const selectedStatus = useWatch({ control: form.control, name: 'status' })
  const maxWeight = phase
    ? remainingWeight + Number(phase.weight_percent)
    : remainingWeight

  useEffect(() => {
    if (!open) {
      return
    }

    form.reset({
      name: phase?.name ?? '',
      description: phase?.description ?? '',
      weight_percent: phase?.weight_percent ?? Math.min(maxWeight, 0),
      status: phase?.status ?? 'pending',
    })
  }, [form, maxWeight, open, phase])

  const handleSubmit = form.handleSubmit(async (values) => {
    if (values.weight_percent > maxWeight + 0.001) {
      form.setError('weight_percent', {
        message: `Weight cannot exceed ${maxWeight.toFixed(1)}% for the remaining budget`,
      })
      return
    }

    await onSubmit(values)
    onOpenChange(false)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{phase ? 'Edit phase' : 'Add phase'}</DialogTitle>
          <DialogDescription>
            Phase weights across the project must total 100%. Up to{' '}
            {maxWeight.toFixed(1)}% available.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="phase-name">Name</Label>
            <Input id="phase-name" {...form.register('name')} />
            {form.formState.errors.name ? (
              <p className="text-sm text-red-600">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phase-description">Description</Label>
            <Textarea
              id="phase-description"
              rows={3}
              {...form.register('description')}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phase-weight">Weight (%)</Label>
              <Input
                id="phase-weight"
                type="number"
                min="0"
                max={maxWeight}
                step="0.1"
                {...form.register('weight_percent', { valueAsNumber: true })}
              />
              {form.formState.errors.weight_percent ? (
                <p className="text-sm text-red-600">
                  {form.formState.errors.weight_percent.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) =>
                  form.setValue('status', value as PhaseStatus)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(PHASE_STATUS_LABELS) as [
                      PhaseStatus,
                      string,
                    ][]
                  ).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : phase ? 'Save changes' : 'Add phase'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
