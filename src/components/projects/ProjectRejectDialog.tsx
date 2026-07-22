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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  projectRejectSchema,
  type ProjectRejectValues,
} from '@/lib/validations/approval'

interface ProjectRejectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectTitle: string | null
  onSubmit: (values: ProjectRejectValues) => Promise<void>
  isSubmitting: boolean
}

export function ProjectRejectDialog({
  open,
  onOpenChange,
  projectTitle,
  onSubmit,
  isSubmitting,
}: ProjectRejectDialogProps) {
  const form = useForm<ProjectRejectValues>({
    resolver: zodResolver(projectRejectSchema),
    defaultValues: {
      rejection_reason: '',
    },
  })

  useEffect(() => {
    if (!open) {
      return
    }

    form.reset({ rejection_reason: '' })
  }, [form, open])

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values)
    onOpenChange(false)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject proposal</DialogTitle>
          <DialogDescription>
            {projectTitle
              ? `Provide a reason for rejecting "${projectTitle}". The factory manager will see this feedback.`
              : 'Provide a reason for rejecting this proposal.'}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">Rejection reason</Label>
            <Textarea
              id="rejection-reason"
              rows={4}
              placeholder="Explain what needs to change before this proposal can be approved."
              {...form.register('rejection_reason')}
            />
            {form.formState.errors.rejection_reason ? (
              <p className="text-sm text-red-600">
                {form.formState.errors.rejection_reason.message}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? 'Rejecting…' : 'Reject proposal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
