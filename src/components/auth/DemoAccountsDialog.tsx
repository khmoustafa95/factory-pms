import { Copy, Info } from 'lucide-react'
import { toast } from 'sonner'
import { StatusMessage } from '@/components/StatusMessage'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useTranslation } from '@/contexts/LocaleContext'
import { getAppEnv } from '@/lib/app-env'
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/lib/demo-accounts'

export function DemoAccountsDialog() {
  const { t } = useTranslation()
  const isStaging = getAppEnv() === 'staging'

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(t('auth.demoAccounts.copied', { label }))
    } catch {
      toast.error(t('auth.demoAccounts.copyFailed'))
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="w-full">
          <Info className="size-4" />
          {t('auth.demoAccounts.button')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('auth.demoAccounts.title')}</DialogTitle>
          <DialogDescription>
            {t('auth.demoAccounts.description')}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {isStaging ? (
            <StatusMessage variant="warning">
              {t('auth.demoAccounts.stagingSetupHint')}
            </StatusMessage>
          ) : null}

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
            <div>
              <p className="text-sm font-medium">{t('auth.password')}</p>
              <p className="font-mono text-sm">{DEMO_PASSWORD}</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                void copyToClipboard(DEMO_PASSWORD, t('auth.password'))
              }
            >
              <Copy className="size-4" />
              {t('auth.demoAccounts.copyPassword')}
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.email')}</TableHead>
                  <TableHead>{t('common.role')}</TableHead>
                  <TableHead>{t('common.factory')}</TableHead>
                  <TableHead>{t('common.notes')}</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {DEMO_ACCOUNTS.map((account) => (
                  <TableRow key={account.email}>
                    <TableCell className="font-mono text-xs sm:text-sm">
                      {account.email}
                    </TableCell>
                    <TableCell>{t(account.roleKey)}</TableCell>
                    <TableCell>{account.factory}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {t(account.notesKey)}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          void copyToClipboard(account.email, t('common.email'))
                        }
                        aria-label={t('auth.demoAccounts.copyEmail')}
                      >
                        <Copy className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
