import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { FactoryFormDialog } from '@/components/factories/FactoryFormDialog'
import { PageHeader } from '@/components/PageHeader'
import { ResponsiveTable } from '@/components/ResponsiveTable'
import { StatusMessage } from '@/components/StatusMessage'
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
import { useTranslation } from '@/contexts/LocaleContext'
import {
  useCreateFactory,
  useFactories,
  useUpdateFactory,
} from '@/hooks/useFactories'
import type { Factory } from '@/types/database'

export function FactoriesPage() {
  const { t } = useTranslation()
  const { data: factories = [], isLoading, error } = useFactories()
  const createFactory = useCreateFactory()
  const updateFactory = useUpdateFactory()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingFactory, setEditingFactory] = useState<Factory | null>(null)
  const notAvailable = t('common.notAvailable')

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
        toast.success(t('factories.updated'))
      } else {
        await createFactory.mutateAsync(values)
        toast.success(t('factories.created'))
      }
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : t('factories.saveFailed')
      toast.error(message)
      throw submitError
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title={t('factories.title')}
        description={t('factories.description')}
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            {t('common.addFactory')}
          </Button>
        }
      />

      {isLoading ? (
        <StatusMessage>{t('factories.loading')}</StatusMessage>
      ) : null}

      {error ? (
        <StatusMessage variant="error">
          {error instanceof Error ? error.message : t('factories.loadFailed')}
        </StatusMessage>
      ) : null}

      {!isLoading && !error ? (
        <ResponsiveTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>{t('common.code')}</TableHead>
                <TableHead>{t('common.location')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="text-right">
                  {t('common.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {factories.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {t('factories.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                factories.map((factory) => (
                  <TableRow key={factory.id}>
                    <TableCell className="font-medium">
                      {factory.name}
                    </TableCell>
                    <TableCell>{factory.code}</TableCell>
                    <TableCell>{factory.location ?? notAvailable}</TableCell>
                    <TableCell>
                      <Badge
                        variant={factory.is_active ? 'default' : 'secondary'}
                      >
                        {factory.is_active
                          ? t('common.active')
                          : t('common.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(factory)}
                      >
                        {t('common.edit')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ResponsiveTable>
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
