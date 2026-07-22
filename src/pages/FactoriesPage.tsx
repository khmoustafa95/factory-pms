import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { AdaptiveList } from '@/components/AdaptiveList'
import { FactoryFormDialog } from '@/components/factories/FactoryFormDialog'
import { PageHeader } from '@/components/PageHeader'
import { QueryState } from '@/components/QueryState'
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
  const {
    data: factories = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useFactories()
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

      <QueryState
        isLoading={isLoading}
        error={error}
        loadingMessage={t('factories.loading')}
        errorMessage={t('factories.loadFailed')}
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      >
        <AdaptiveList
          items={factories}
          emptyMessage={t('factories.empty')}
          getKey={(factory) => factory.id}
          renderMobileCard={(factory) => (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{factory.name}</p>
                <Badge variant={factory.is_active ? 'default' : 'secondary'}>
                  {factory.is_active
                    ? t('common.active')
                    : t('common.inactive')}
                </Badge>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">
                    {t('common.code')}:{' '}
                  </span>
                  {factory.code}
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    {t('common.location')}:{' '}
                  </span>
                  {factory.location ?? notAvailable}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openEdit(factory)}
              >
                {t('common.edit')}
              </Button>
            </div>
          )}
        >
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
              {factories.map((factory) => (
                <TableRow key={factory.id}>
                  <TableCell className="font-medium">{factory.name}</TableCell>
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
              ))}
            </TableBody>
          </Table>
        </AdaptiveList>
      </QueryState>

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
