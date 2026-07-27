import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { QueryState } from '@/components/QueryState'
import { FormFieldError } from '@/components/FormFieldError'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useTranslation } from '@/contexts/LocaleContext'
import {
  useCurrencies,
  useCreateCurrency,
  useUpdateCurrency,
  useDeleteCurrency,
} from '@/hooks/useCurrencies'
import type { Currency } from '@/types/database'

const currencySchema = z.object({
  code: z.string().trim().min(3).max(3),
  name_en: z.string().trim().min(2),
  name_ar: z.string().trim().min(2),
  symbol: z.string().trim().max(5),
  is_active: z.boolean(),
})

type CurrencyFormValues = z.infer<typeof currencySchema>

export function CurrencySettingsTab() {
  const { t, locale } = useTranslation()
  const {
    data: currencies = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useCurrencies()
  const createCurrency = useCreateCurrency()
  const updateCurrency = useUpdateCurrency()
  const deleteCurrency = useDeleteCurrency()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Currency | null>(null)

  const form = useForm<CurrencyFormValues>({
    resolver: zodResolver(currencySchema),
    defaultValues: {
      code: '',
      name_en: '',
      name_ar: '',
      symbol: '',
      is_active: true,
    },
  })

  const isActiveValue = useWatch({ control: form.control, name: 'is_active' })

  const openCreate = () => {
    setEditing(null)
    form.reset({
      code: '',
      name_en: '',
      name_ar: '',
      symbol: '',
      is_active: true,
    })
    setDialogOpen(true)
  }

  const openEdit = (currency: Currency) => {
    setEditing(currency)
    form.reset({
      code: currency.code,
      name_en: currency.name_en,
      name_ar: currency.name_ar,
      symbol: currency.symbol,
      is_active: currency.is_active,
    })
    setDialogOpen(true)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (editing) {
        await updateCurrency.mutateAsync({
          id: editing.id,
          code: values.code,
          name_en: values.name_en,
          name_ar: values.name_ar,
          symbol: values.symbol,
          is_active: values.is_active,
        })
        toast.success(t('settings.currencies.updated'))
      } else {
        await createCurrency.mutateAsync({
          code: values.code,
          name_en: values.name_en,
          name_ar: values.name_ar,
          symbol: values.symbol,
          is_active: values.is_active,
        })
        toast.success(t('settings.currencies.created'))
      }
      setDialogOpen(false)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('settings.saveFailed')
      toast.error(message)
    }
  })

  const handleDelete = async (currency: Currency) => {
    if (currency.is_default) return
    try {
      await deleteCurrency.mutateAsync(currency.id)
      toast.success(t('settings.currencies.deleted'))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('settings.saveFailed')
      toast.error(message)
    }
  }

  const handleSetDefault = async (currency: Currency) => {
    if (currency.is_default) return
    try {
      const currentDefault = currencies.find((c) => c.is_default)
      if (currentDefault) {
        await updateCurrency.mutateAsync({
          id: currentDefault.id,
          is_default: false,
        })
      }
      await updateCurrency.mutateAsync({ id: currency.id, is_default: true })
      toast.success(t('settings.currencies.defaultSet'))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('settings.saveFailed')
      toast.error(message)
    }
  }

  const isMutating =
    createCurrency.isPending ||
    updateCurrency.isPending ||
    deleteCurrency.isPending

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('settings.currencies.title')}</CardTitle>
              <CardDescription>
                {t('settings.currencies.description')}
              </CardDescription>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4" />
              {t('settings.currencies.add')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <QueryState
            isLoading={isLoading}
            error={error}
            onRetry={() => void refetch()}
            isRetrying={isFetching}
            loadingMessage={t('common.loading')}
            errorMessage={t('settings.currencies.loadFailed')}
          >
            {currencies.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('settings.currencies.empty')}
              </p>
            ) : (
              <div className="space-y-2">
                {currencies.map((currency) => (
                  <div
                    key={currency.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-medium">
                        {currency.code}
                      </span>
                      {currency.symbol ? (
                        <span className="text-muted-foreground">
                          ({currency.symbol})
                        </span>
                      ) : null}
                      <span className="text-sm">
                        {locale === 'ar' ? currency.name_ar : currency.name_en}
                      </span>
                      {currency.is_default ? (
                        <Star className="size-4 fill-yellow-400 text-yellow-400" />
                      ) : null}
                      {!currency.is_active ? (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          {t('common.inactive')}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1">
                      {!currency.is_default ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          disabled={isMutating}
                          onClick={() => void handleSetDefault(currency)}
                          title={t('settings.currencies.setDefault')}
                        >
                          <Star className="size-4" />
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => openEdit(currency)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      {!currency.is_default ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive"
                          disabled={isMutating}
                          onClick={() => void handleDelete(currency)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </QueryState>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? t('settings.currencies.editTitle')
                : t('settings.currencies.addTitle')}
            </DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>{t('settings.currencies.code')}</Label>
              <Input
                className="uppercase"
                maxLength={3}
                disabled={Boolean(editing)}
                {...form.register('code')}
              />
              <FormFieldError error={form.formState.errors.code} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('settings.currencies.nameEn')}</Label>
                <Input {...form.register('name_en')} />
                <FormFieldError error={form.formState.errors.name_en} />
              </div>
              <div className="space-y-2">
                <Label>{t('settings.currencies.nameAr')}</Label>
                <Input dir="rtl" {...form.register('name_ar')} />
                <FormFieldError error={form.formState.errors.name_ar} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('settings.currencies.symbol')}</Label>
              <Input maxLength={5} {...form.register('symbol')} />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={isActiveValue}
                onCheckedChange={(checked) =>
                  form.setValue('is_active', checked)
                }
              />
              <Label>{t('common.active')}</Label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isMutating}>
                {isMutating ? t('common.saving') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
