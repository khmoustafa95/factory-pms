import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { FactoryFormDialog } from '@/components/factories/FactoryFormDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useCreateFactory,
  useFactories,
  useUpdateFactory,
} from '@/hooks/useFactories'
import type { Factory } from '@/types/database'

export function FactoriesPage() {
  const { data: factories = [], isLoading, error } = useFactories()
  const createFactory = useCreateFactory()
  const updateFactory = useUpdateFactory()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingFactory, setEditingFactory] = useState<Factory | null>(null)

  const openCreate = () => {
    setEditingFactory(null)
    setDialogOpen(true)
  }

  const openEdit = (factory: Factory) => {
    setEditingFactory(factory)
    setDialogOpen(true)
  }

  const handleSubmit = async (
    values: Parameters<typeof createFactory.mutateAsync>[0],
  ) => {
    try {
      if (editingFactory) {
        await updateFactory.mutateAsync({ id: editingFactory.id, values })
        toast.success('Factory updated')
      } else {
        await createFactory.mutateAsync(values)
        toast.success('Factory created')
      }
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Unable to save factory'
      toast.error(message)
      throw submitError
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Factories</h1>
          <p className="max-w-2xl text-slate-600">
            Company directors maintain the factory catalog used for project
            scope and manager assignments.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Add factory
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading factories…</p>
      ) : null}

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Failed to load factories'}
        </p>
      ) : null}

      {!isLoading && !error ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {factories.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-slate-500"
                  >
                    No factories yet. Create the first factory to get started.
                  </TableCell>
                </TableRow>
              ) : (
                factories.map((factory) => (
                  <TableRow key={factory.id}>
                    <TableCell className="font-medium">
                      {factory.name}
                    </TableCell>
                    <TableCell>{factory.code}</TableCell>
                    <TableCell>{factory.location ?? '—'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={factory.is_active ? 'default' : 'secondary'}
                      >
                        {factory.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(factory)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : null}

      <FactoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        factory={editingFactory}
        onSubmit={handleSubmit}
        isSubmitting={createFactory.isPending || updateFactory.isPending}
      />
    </section>
  )
}
