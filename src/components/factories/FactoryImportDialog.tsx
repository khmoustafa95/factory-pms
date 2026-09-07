import { useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { FileDropzone } from '@/components/files/FileDropzone'
import { StatusMessage } from '@/components/StatusMessage'
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
import { useTranslation } from '@/contexts/LocaleContext'
import { useFactories, useUpsertFactories } from '@/hooks/useFactories'
import {
  classifyFactoryUpserts,
  downloadFactoriesTemplate,
  parseFactoryImportRows,
  type FactoryImportError,
  type FactoryWritePayload,
} from '@/lib/import/factories-import'
import {
  parseSpreadsheetFile,
  SpreadsheetParseError,
} from '@/lib/import/spreadsheet'
import { toastMutationError } from '@/lib/mutation-error'

interface FactoryImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ImportStep = 'prompt' | 'file'

type FileState =
  | { kind: 'idle' }
  | { kind: 'parsing' }
  | { kind: 'errors'; errors: FactoryImportError[] }
  | { kind: 'ready'; payloads: FactoryWritePayload[] }

function formatImportError(
  error: FactoryImportError,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  if (error.row === undefined) {
    return error.message
  }

  return t('factories.import.rowError', {
    row: error.row,
    message: error.message,
  })
}

function parseFileErrorMessage(
  error: unknown,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  if (error instanceof SpreadsheetParseError) {
    if (error.reason === 'unsupported') {
      return t('factories.import.unsupportedType')
    }
    if (error.reason === 'empty') {
      return t('factories.import.emptyFile')
    }
  }

  return t('factories.import.invalidFile')
}

export function FactoryImportDialog({
  open,
  onOpenChange,
}: FactoryImportDialogProps) {
  const { t, dir } = useTranslation()
  const factoriesQuery = useFactories({ enabled: open })
  const upsertFactories = useUpsertFactories()
  const [step, setStep] = useState<ImportStep>('prompt')
  const [fileState, setFileState] = useState<FileState>({ kind: 'idle' })

  const reset = () => {
    setStep('prompt')
    setFileState({ kind: 'idle' })
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset()
    }
    onOpenChange(nextOpen)
  }

  const templateCopy = {
    instructionsTitle: t('factories.import.instructionsTitle'),
    instructionLines: [
      t('factories.import.instructionsColumns'),
      t('factories.import.instructionsUpsert'),
      t('factories.import.instructionsActive'),
      t('factories.import.instructionsExample'),
    ],
  }

  const handleDownloadTemplate = async () => {
    try {
      await downloadFactoriesTemplate(templateCopy, {
        rightToLeft: dir === 'rtl',
      })
      toast.success(t('factories.import.templateDownloaded'))
      setStep('file')
    } catch {
      toast.error(t('factories.import.templateFailed'))
    }
  }

  const handleFiles = async (files: File[]) => {
    const file = files[0]
    if (!file) {
      return
    }

    setFileState({ kind: 'parsing' })

    try {
      const grid = await parseSpreadsheetFile(file)
      const parsed = parseFactoryImportRows(grid, t)
      if (!parsed.ok) {
        setFileState({ kind: 'errors', errors: parsed.errors })
        return
      }

      setFileState({ kind: 'ready', payloads: parsed.payloads })
    } catch (error) {
      setFileState({
        kind: 'errors',
        errors: [{ message: parseFileErrorMessage(error, t) }],
      })
    }
  }

  const handleConfirm = async () => {
    if (fileState.kind !== 'ready') {
      return
    }

    const existingCodes = (factoriesQuery.data ?? []).map(
      (factory) => factory.code,
    )
    const { toInsert, toUpdate } = classifyFactoryUpserts(
      fileState.payloads,
      existingCodes,
    )

    try {
      await upsertFactories.mutateAsync(fileState.payloads)
      toast.success(
        t('factories.import.success', {
          inserted: toInsert.length,
          updated: toUpdate.length,
        }),
      )
      handleOpenChange(false)
    } catch (error) {
      toastMutationError(error, t('factories.import.failed'), t)
    }
  }

  const classified =
    fileState.kind === 'ready'
      ? classifyFactoryUpserts(
          fileState.payloads,
          (factoriesQuery.data ?? []).map((factory) => factory.code),
        )
      : null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('factories.import.title')}</DialogTitle>
          <DialogDescription>
            {step === 'prompt'
              ? t('factories.import.promptDescription')
              : t('factories.import.fileDescription')}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {step === 'prompt' ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                onClick={() => void handleDownloadTemplate()}
              >
                <Download className="size-4" />
                {t('factories.import.downloadTemplate')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('file')}
              >
                {t('factories.import.continueWithoutTemplate')}
              </Button>
            </div>
          ) : (
            <>
              <FileDropzone
                multiple={false}
                accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                disabled={
                  fileState.kind === 'parsing' || upsertFactories.isPending
                }
                idleLabel={t('factories.import.dropzoneIdle')}
                activeLabel={t('factories.import.dropzoneActive')}
                onFiles={(files) => void handleFiles(files)}
              />

              {fileState.kind === 'parsing' ? (
                <StatusMessage>{t('common.loading')}</StatusMessage>
              ) : null}

              {fileState.kind === 'errors' ? (
                <div
                  role="alert"
                  className="motion-fade-in space-y-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  <p className="font-medium">
                    {t('factories.import.errorsTitle')}
                  </p>
                  <ul className="list-disc space-y-1 ps-5">
                    {fileState.errors.map((error, index) => (
                      <li key={`${error.row ?? 'file'}-${index}`}>
                        {formatImportError(error, t)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {fileState.kind === 'ready' ? (
                <StatusMessage variant="info">
                  {factoriesQuery.isSuccess && classified
                    ? `${t('factories.import.previewInsert', {
                        count: classified.toInsert.length,
                      })} ${t('factories.import.previewUpdate', {
                        count: classified.toUpdate.length,
                      })}`
                    : t('factories.import.previewTotal', {
                        count: fileState.payloads.length,
                      })}
                </StatusMessage>
              ) : null}
            </>
          )}
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={upsertFactories.isPending}
          >
            {t('common.cancel')}
          </Button>
          {step === 'file' && fileState.kind === 'errors' ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setFileState({ kind: 'idle' })}
            >
              <Upload className="size-4" />
              {t('factories.import.chooseAnotherFile')}
            </Button>
          ) : null}
          {step === 'file' && fileState.kind === 'ready' ? (
            <Button
              type="button"
              disabled={upsertFactories.isPending}
              onClick={() => void handleConfirm()}
            >
              {upsertFactories.isPending
                ? t('common.submitting')
                : t('factories.import.confirm')}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
