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
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/contexts/LocaleContext'
import { useFactories } from '@/hooks/useFactories'
import { useProjectUpsertKeys, useUpsertProjects } from '@/hooks/useProjects'
import {
  classifyProjectUpserts,
  downloadProjectsTemplate,
  parseProjectImportRows,
  type ProjectImportError,
  type ProjectWritePayload,
} from '@/lib/import/projects-import'
import {
  parseSpreadsheetFile,
  SpreadsheetParseError,
} from '@/lib/import/spreadsheet'
import { toastMutationError } from '@/lib/mutation-error'

interface ProjectImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ImportStep = 'prompt' | 'file'

type FileState =
  | { kind: 'idle' }
  | { kind: 'parsing' }
  | { kind: 'errors'; errors: ProjectImportError[] }
  | { kind: 'ready'; payloads: ProjectWritePayload[] }

function formatImportError(
  error: ProjectImportError,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  if (error.row === undefined) {
    return error.message
  }

  return t('projects.import.rowError', {
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
      return t('projects.import.unsupportedType')
    }
    if (error.reason === 'empty') {
      return t('projects.import.emptyFile')
    }
  }

  return t('projects.import.invalidFile')
}

export function ProjectImportDialog({
  open,
  onOpenChange,
}: ProjectImportDialogProps) {
  const { t, dir } = useTranslation()
  const { user } = useAuth()
  const factoriesQuery = useFactories({ enabled: open })
  const upsertKeysQuery = useProjectUpsertKeys(open)
  const upsertProjects = useUpsertProjects()
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
    instructionsTitle: t('projects.import.instructionsTitle'),
    instructionLines: [
      t('projects.import.instructionsColumns'),
      t('projects.import.instructionsUpsert'),
      t('projects.import.instructionsPriority'),
      t('projects.import.instructionsExample'),
    ],
  }

  const handleDownloadTemplate = async () => {
    try {
      await downloadProjectsTemplate(templateCopy, {
        rightToLeft: dir === 'rtl',
      })
      toast.success(t('projects.import.templateDownloaded'))
      setStep('file')
    } catch {
      toast.error(t('projects.import.templateFailed'))
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
      const parsed = parseProjectImportRows(grid, t, {
        factories: factoriesQuery.data ?? [],
      })
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
    if (fileState.kind !== 'ready' || !user?.id) {
      return
    }

    const { toInsert, toUpdate } = classifyProjectUpserts(
      fileState.payloads,
      upsertKeysQuery.data ?? [],
    )

    try {
      await upsertProjects.mutateAsync({
        payloads: fileState.payloads,
        userId: user.id,
      })
      toast.success(
        t('projects.import.success', {
          inserted: toInsert.length,
          updated: toUpdate.length,
        }),
      )
      handleOpenChange(false)
    } catch (error) {
      toastMutationError(error, t('projects.import.failed'), t)
    }
  }

  const classified =
    fileState.kind === 'ready'
      ? classifyProjectUpserts(
          fileState.payloads,
          upsertKeysQuery.data ?? [],
        )
      : null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('projects.import.title')}</DialogTitle>
          <DialogDescription>
            {step === 'prompt'
              ? t('projects.import.promptDescription')
              : t('projects.import.fileDescription')}
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
                {t('projects.import.downloadTemplate')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('file')}
              >
                {t('projects.import.continueWithoutTemplate')}
              </Button>
            </div>
          ) : (
            <>
              <FileDropzone
                multiple={false}
                accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                disabled={
                  fileState.kind === 'parsing' ||
                  upsertProjects.isPending ||
                  factoriesQuery.isLoading
                }
                idleLabel={t('projects.import.dropzoneIdle')}
                activeLabel={t('projects.import.dropzoneActive')}
                onFiles={(files) => void handleFiles(files)}
              />

              {fileState.kind === 'parsing' || factoriesQuery.isLoading ? (
                <StatusMessage>{t('common.loading')}</StatusMessage>
              ) : null}

              {fileState.kind === 'errors' ? (
                <div
                  role="alert"
                  className="motion-fade-in space-y-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  <p className="font-medium">
                    {t('projects.import.errorsTitle')}
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
                  {upsertKeysQuery.isSuccess && classified
                    ? `${t('projects.import.previewInsert', {
                        count: classified.toInsert.length,
                      })} ${t('projects.import.previewUpdate', {
                        count: classified.toUpdate.length,
                      })}`
                    : t('projects.import.previewTotal', {
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
            disabled={upsertProjects.isPending}
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
              {t('projects.import.chooseAnotherFile')}
            </Button>
          ) : null}
          {step === 'file' && fileState.kind === 'ready' ? (
            <Button
              type="button"
              disabled={upsertProjects.isPending || !user?.id}
              onClick={() => void handleConfirm()}
            >
              {upsertProjects.isPending
                ? t('common.submitting')
                : t('projects.import.confirm')}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
