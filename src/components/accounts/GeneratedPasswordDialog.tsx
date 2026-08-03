import { Copy } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTranslation } from '@/contexts/LocaleContext'

interface GeneratedPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  email?: string | null
  password: string | null
}

export function GeneratedPasswordDialog({
  open,
  onOpenChange,
  email,
  password,
}: GeneratedPasswordDialogProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!password) {
      return
    }

    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      toast.success(t('accounts.passwordCopied'))
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('accounts.passwordCopyFailed'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('accounts.generatedPasswordTitle')}</DialogTitle>
          <DialogDescription>
            {t('accounts.generatedPasswordDescription')}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {email ? (
            <div className="space-y-2">
              <Label>{t('common.email')}</Label>
              <Input value={email} readOnly />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>{t('auth.password')}</Label>
            <div className="flex gap-2">
              <Input
                value={password ?? ''}
                readOnly
                className="font-mono"
                type="text"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => void handleCopy()}
                aria-label={t('accounts.copyPassword')}
              >
                <Copy className="size-4" />
              </Button>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {copied ? t('accounts.passwordCopied') : t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
